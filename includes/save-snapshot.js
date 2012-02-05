// ==UserScript==
// @include http://*
// @include https://*
// ==/UserScript==

(function(){
var bImages = false, bB64enc = true, bDebug = false;
function log(){ if (bDebug) opera.postError('[SaveSnapshot]: ' + Array.prototype.slice.call(arguments)); }
    
var getsnapshot = function () {
    var uriEncodeImg = function (img) {
            var canvas = window.document.getElementById('tmpcanvas');
            if (!canvas) canvas = window.document.createElement('canvas');
            canvas.id = 'tmpcanvas';
            
            var context = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
            
            var result = null;
            try { result = canvas.toDataURL(); } 
            catch (bug) { //no cross-domain images allowed
                log(img.src + ' is crossdomain or don\'t come with access-control-allow for CORS.' );
            }
            return result;
    };
    var encodeBase64 = function (a) {
        if (!bB64enc) return a;
        else log('encoding page content as base64...');
        var b, c, d, e = '',
            f = [],
            i = 0,
            j = 0,
            g = 0,
            h = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('');
        while (g = a.charCodeAt(j++)) {
            if (g < 128) {
                f[f.length] = g;
            } else if (g < 2048) {
                f[f.length] = 192 | (g >> 6);
                f[f.length] = 128 | (g & 63);
            } else if (g < 65536) {
                f[f.length] = 224 | (g >> 12);
                f[f.length] = 128 | ((g >> 6) & 63);
                f[f.length] = 128 | (g & 63);
            } else {
                f[f.length] = 240 | (g >> 18);
                f[f.length] = 128 | ((g >> 12) & 63);
                f[f.length] = 128 | ((g >> 6) & 63);
                f[f.length] = 128 | (g & 63);
            }
        };
        while (i < f.length) {
            b = f[i++];
            c = f[i++];
            d = f[i++];
            e += h[b >> 2];
            e += h[((b & 3) << 4) | (c >> 4)];
            e += h[c === undefined ? 64 : ((c & 15) << 2) | (d >> 6)];
            e += h[d === undefined ? 64 : d & 63];
        }
        return e;
    };
    var selWin = function (w) {
        if (w.getSelection() != '') return w;
        for (var i = 0, f, r; f = w.frames[i]; i++) {
            try { if (r = arguments.callee(f)) return r; } catch (bug) {}
        }
    };
    
    var ele, pEle, clone;
    var doctype = '';
    var doc = window.document;
    var loc = window.location;
    var win = selWin(window);
    var domain=loc.protocol+'//'+loc.host+(loc.port!=''?':'+loc.port:'');
    
    if (win) {
        doc = win.document;
        loc = win.location;
        var s = win.getSelection();
        if (s) {
            var r = s.getRangeAt(0);
            pEle = r.commonAncestorContainer;
            ele = r.cloneContents();
        } else {
            log('error, expected selection got null');
        }
    } else {
        pEle = doc.documentElement;
        ele = (doc.body || doc.getElementsByTagName('body')[0]).cloneNode(true);
    }

    log('cloning document...');
    while (pEle) {
        if (pEle.nodeType === 1 /* Node.DOCUMENT_POSITION_DISCONNECTED */) {
            clone = pEle.cloneNode(false);
            clone.appendChild(ele);
            ele = clone;
        }
        pEle = pEle.parentNode;
    };
        
    var sel = doc.createElement('div');
    sel.appendChild(ele);
    
    log('parsing images = ' + bImages);
    if (bImages) {
        var imgcache = [], logarray = [], images = sel.getElementsByTagName('img');
        for (var i = images.length; i--;) {
            var imgsrc = images[i].src;
            if (imgsrc === null) continue;
            if (domain == imgsrc.substring(0, domain.length)) {
                if (bDebug) logarray.push('parsing image ' + imgsrc);
                if (imgcache[imgsrc]) images[i].src = imgcache[imgsrc];
                else {
                    if (imgcache[imgsrc] = uriEncodeImg(images[i])) images[i].src = imgcache[imgsrc];
                    if (bDebug) logarray.push('img cached and converted to ' + imgcache[imgsrc].substring(0,70)+'...');
                }
            }
        };
        logarray.length && log(logarray.join('\n'));
        imgcache = logarray = null;
    }
    
    log('removing scripts...');
    var scripts = sel.getElementsByTagName('script');
    for (var i = scripts.length; i--;) {
        scripts[i].parentNode.removeChild(scripts[i]);
    }
      
    var h = ele.insertBefore(doc.createElement('head'), ele.firstChild);
    var title = doc.getElementsByTagName('title')[0];
    title = title ? title.text : 'untitled';
    var link = loc.href;
    
    var t = doc.createElement('title');
    t.text = title;
    h.appendChild(t);
    
    var meta = doc.createElement('meta');
    meta.httpEquiv = 'content-type';
    meta.content = 'text/html; charset=utf-8';
    h.appendChild(meta);
    
    var base = doc.getElementsByTagName('base')[0];
    var b = base ? base.cloneNode(false) : doc.createElement('base');
    if (!b.href) b.href = link;
    h.appendChild(b);
    
    log('parsing styles...');
    var styles = doc.styleSheets;
    for (var i = 0, si; si = styles[i]; i++) {
        var style = doc.createElement('style');
        style.type = 'text/css';
        if (si.media.mediaText) style.media = si.media.mediaText;
        try {
            for (var j = 0, rule; rule = si.cssRules[j]; j++) {
                style.appendChild(doc.createTextNode(rule.cssText + '\n'));
            }
        } catch (bug) {
            if (si.ownerNode) style = si.ownerNode.cloneNode(false);
        }
        h.appendChild(style);
    };
    
    var dt = doc.doctype;
    if (dt && dt.name) {
        doctype += '<!DOCTYPE ' + dt.name;
        if (dt.publicId) doctype += ' PUBLIC \x22' + dt.publicId + '\x22';
        if (dt.systemId) doctype += ' \x22' + dt.systemId + '\x22';
        doctype += '>\n';
    }
    
    log('page snapshot successfuly created.');
    return 'data:text/phf;charset=UTF-8;base64,' + encodeBase64(doctype + sel.innerHTML + '\n<!-- Saved from: ' + link + ' @ ' + Date() + ' -->');
};

document.addEventListener('DOMContentLoaded', function() {
if(opera.extension)
    opera.extension.onmessage = function(e) {
        switch (e.data.type) {
            case 'save-snapshot':
            case 'save-snapshot-encode':
                bDebug = e.data.debug;
                log('got "' + e.data.type + '" message for url=' + e.data.url);
                if(window.location.href.indexOf(e.data.url) == -1) break;
                //don't know why, but opera returns incomplete urls for tabs sometimes
                bImages = e.data.images;
                bB64enc = e.data.b64;

                if(e.source) {
                    e.source.postMessage({
                        type: 'got-url',
                        url: getsnapshot()
                    });
                    ///////////////////
                    var noe = document.createEvent('CustomEvent');
                    noe.initCustomEvent('Notify.It', false, false, {
                        extension: 'save-snapshot',
                        text: 'Page snapshot created.',
                        type: '',
                    });
                    document.dispatchEvent(noe);
                    ///////////////////
                } else {
                    log('e.source not exist.');
                }
                break;
        }
    };
}, false);

})();