export const SLICE_BUNDLE_META = {
  "version": "2",
  "bundleKey": "multiroute-appshell--p2",
  "type": "route",
  "routes": [
    "multiroute-AppShell--p2"
  ],
  "componentCount": 15
};

const SLICE_BUNDLE_DEPENDENCIES = {};
const __sliceDefaultExportWarningDeps = new Set();
const __sliceDefaultExportPreferredKeys = ['module', 'exports', 'purify'];
const __sliceDeterministicKeyCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function __sliceResolveDefaultExport(dep, depName, preferredKey) {
  if (dep?.default !== undefined) return dep.default;
  if (dep === null || (typeof dep !== 'object' && typeof dep !== 'function')) return dep;
  if (preferredKey && preferredKey !== 'default' && preferredKey !== '__esModule' && Object.prototype.hasOwnProperty.call(dep, preferredKey)) return dep[preferredKey];
  const keys = Object.keys(dep).filter((key) => key !== 'default' && key !== '__esModule');
  if (keys.length === 1) return dep[keys[0]];
  if (keys.length > 1) {
    const preferredMatches = __sliceDefaultExportPreferredKeys.filter((key) => keys.includes(key));
    if (preferredMatches.length === 1) return dep[preferredMatches[0]];
    const sortedKeys = [...keys].sort(__sliceDeterministicKeyCompare);
    const fallbackKey = sortedKeys[0];
    const warningDepName = depName || "<unknown dependency>";
    if (!__sliceDefaultExportWarningDeps.has(warningDepName)) {
      __sliceDefaultExportWarningDeps.add(warningDepName);
      console.warn(`[Slice.js bundler] Ambiguous default export resolution for "${warningDepName}". Falling back to "${fallbackKey}". Keys: ${sortedKeys.join(', ')}`);
    }
    return dep[fallbackKey];
  }
  return dep;
}
const __sliceSharedDeps = typeof window !== 'undefined' ? (window.__SLICE_SHARED_DEPS__ || {}) : {};
const __sliceResolveBundleDependency = (depName) => Object.prototype.hasOwnProperty.call(__sliceSharedDeps, depName) ? __sliceSharedDeps[depName] : SLICE_BUNDLE_DEPENDENCIES[depName];
const __sliceDepExports0 = (() => {
const __sliceExports = {};
// Pure geometry helpers for DragDropService — no DOM, no state.
//
// Extracted so they can be unit-tested in Node (see DragDropService.test.js),
// the same way DataGridEngine exposes its math as static helpers. The service
// imports these; consumers never touch them directly.

// Maps a handle name to the box edges it drives.
function getHandleConfig(name) {
  const MAP = {
    n:  { edges: ['n'] },
    s:  { edges: ['s'] },
    e:  { edges: ['e'] },
    w:  { edges: ['w'] },
    ne: { edges: ['n', 'e'] },
    nw: { edges: ['n', 'w'] },
    se: { edges: ['s', 'e'] },
    sw: { edges: ['s', 'w'] },
  };
  return MAP[name] || null;
}
__sliceExports.getHandleConfig = getHandleConfig;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
__sliceExports.clamp = clamp;

// Given the original rect, a pointer delta, and the active edges, returns the
// new { top, left, width, height }. West/north edges move the origin so the
// opposite edge stays pinned; clamping to min/max never lets the box cross over.
function computeResizeRect(orig, delta, edges, minW, minH, maxW, maxH) {
  let { top, left, width, height } = orig;
  if (edges.includes('e')) width = clamp(width + delta.x, minW, maxW);
  if (edges.includes('s')) height = clamp(height + delta.y, minH, maxH);
  if (edges.includes('w')) {
    const nw = clamp(width - delta.x, minW, maxW);
    left += width - nw;
    width = nw;
  }
  if (edges.includes('n')) {
    const nh = clamp(height - delta.y, minH, maxH);
    top += height - nh;
    height = nh;
  }
  return { top, left, width, height };
}
__sliceExports.computeResizeRect = computeResizeRect;
return __sliceExports;
})();
SLICE_BUNDLE_DEPENDENCIES["Components/Providers/DragDropService/dndGeometry.js"] = __sliceDepExports0;
// External dependency: dompurify
SLICE_BUNDLE_DEPENDENCIES["dompurify"] = (() => {
  const module = { exports: {} };
  let exports = module.exports;
  const require = (id) => {
    throw new Error(`[Slice.js] Unexpected runtime require("${id}") in a bundled dependency`);
  };
    (function(){
      if (typeof globalThis === "undefined") return;
      if (typeof globalThis.global === "undefined") globalThis.global = globalThis;
      if (typeof globalThis.process === "undefined") {
        globalThis.process = { env: { NODE_ENV: "production" }, argv: [], platform: "browser", browser: true, version: "", versions: {}, cwd: function(){ return "/"; }, nextTick: function(cb){ Promise.resolve().then(cb); } };
      } else if (typeof globalThis.process.env === "undefined") {
        globalThis.process.env = { NODE_ENV: "production" };
      }
    })();
    var Zt=Object.defineProperty;var wn=Object.getOwnPropertyDescriptor;var Cn=Object.getOwnPropertyNames;var Mn=Object.prototype.hasOwnProperty;var Pn=(o,r)=>{for(var a in r)Zt(o,a,{get:r[a],enumerable:!0})},xn=(o,r,a,l)=>{if(r&&typeof r=="object"||typeof r=="function")for(let f of Cn(r))!Mn.call(o,f)&&f!==a&&Zt(o,f,{get:()=>r[f],enumerable:!(l=wn(r,f))||l.enumerable});return o};var kn=o=>xn(Zt({},"__esModule",{value:!0}),o);var To={};Pn(To,{default:()=>Je});module.exports=kn(To);function xe(o,r){(r==null||r>o.length)&&(r=o.length);for(var a=0,l=Array(r);a<r;a++)l[a]=o[a];return l}function vn(o){if(Array.isArray(o))return o}function Un(o,r){var a=o==null?null:typeof Symbol<"u"&&o[Symbol.iterator]||o["@@iterator"];if(a!=null){var l,f,m,R,ct=[],M=!0,ut=!1;try{if(m=(a=a.call(o)).next,r!==0)for(;!(M=(l=m.call(a)).done)&&(ct.push(l.value),ct.length!==r);M=!0);}catch(Lt){ut=!0,f=Lt}finally{try{if(!M&&a.return!=null&&(R=a.return(),Object(R)!==R))return}finally{if(ut)throw f}}return ct}}function Fn(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
    In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function zn(o,r){return vn(o)||Un(o,r)||Hn(o,r)||Fn()}function Hn(o,r){if(o){if(typeof o=="string")return xe(o,r);var a={}.toString.call(o).slice(8,-1);return a==="Object"&&o.constructor&&(a=o.constructor.name),a==="Map"||a==="Set"?Array.from(o):a==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(a)?xe(o,r):void 0}}var qe=Object.entries,ke=Object.setPrototypeOf,Gn=Object.isFrozen,Bn=Object.getPrototypeOf,Wn=Object.getOwnPropertyDescriptor,b=Object.freeze,O=Object.seal,lt=Object.create,Ke=typeof Reflect<"u"&&Reflect,oe=Ke.apply,re=Ke.construct;b||(b=function(r){return r});O||(O=function(r){return r});oe||(oe=function(r,a){for(var l=arguments.length,f=new Array(l>2?l-2:0),m=2;m<l;m++)f[m-2]=arguments[m];return r.apply(a,f)});re||(re=function(r){for(var a=arguments.length,l=new Array(a>1?a-1:0),f=1;f<a;f++)l[f-1]=arguments[f];return new r(...l)});var at=A(Array.prototype.forEach),Yn=A(Array.prototype.lastIndexOf),ve=A(Array.prototype.pop),st=A(Array.prototype.push),jn=A(Array.prototype.splice),$=Array.isArray,_t=A(String.prototype.toLowerCase),Jt=A(String.prototype.toString),Ue=A(String.prototype.match),Tt=A(String.prototype.replace),Fe=A(String.prototype.indexOf),$n=A(String.prototype.trim),Xn=A(Number.prototype.toString),Vn=A(Boolean.prototype.toString),ze=typeof BigInt>"u"?null:A(BigInt.prototype.toString),He=typeof Symbol>"u"?null:A(Symbol.prototype.toString),S=A(Object.prototype.hasOwnProperty),ht=A(Object.prototype.toString),y=A(RegExp.prototype.test),J=qn(TypeError);function A(o){return function(r){r instanceof RegExp&&(r.lastIndex=0);for(var a=arguments.length,l=new Array(a>1?a-1:0),f=1;f<a;f++)l[f-1]=arguments[f];return oe(o,r,l)}}function qn(o){return function(){for(var r=arguments.length,a=new Array(r),l=0;l<r;l++)a[l]=arguments[l];return re(o,a)}}function p(o,r){let a=arguments.length>2&&arguments[2]!==void 0?arguments[2]:_t;if(ke&&ke(o,null),!$(r))return o;let l=r.length;for(;l--;){let f=r[l];if(typeof f=="string"){let m=a(f);m!==f&&(Gn(r)||(r[l]=m),f=m)}o[f]=!0}return o}function Kn(o){for(let r=0;r<o.length;r++)S(o,r)||(o[r]=null);return o}function L(o){let r=lt(null);for(let l of qe(o)){var a=zn(l,2);let f=a[0],m=a[1];S(o,f)&&($(m)?r[f]=Kn(m):m&&typeof m=="object"&&m.constructor===Object?r[f]=L(m):r[f]=m)}return r}function Zn(o){switch(typeof o){case"string":return o;case"number":return Xn(o);case"boolean":return Vn(o);case"bigint":return ze?ze(o):"0";case"symbol":return He?He(o):"Symbol()";case"undefined":return ht(o);case"function":case"object":{if(o===null)return ht(o);let r=o,a=H(r,"toString");if(typeof a=="function"){let l=a(r);return typeof l=="string"?l:ht(l)}return ht(o)}default:return ht(o)}}function H(o,r){for(;o!==null;){let l=Wn(o,r);if(l){if(l.get)return A(l.get);if(typeof l.value=="function")return A(l.value)}o=Bn(o)}function a(){return null}return a}function Jn(o){try{return y(o,""),!0}catch{return!1}}var Ge=b(["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dialog","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","picture","pre","progress","q","rp","rt","ruby","s","samp","search","section","select","shadow","slot","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"]),Qt=b(["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","circle","clippath","defs","desc","ellipse","enterkeyhint","exportparts","filter","font","g","glyph","glyphref","hkern","image","inputmode","line","lineargradient","marker","mask","metadata","mpath","part","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","view","vkern"]),te=b(["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feDropShadow","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"]),Qn=b(["animate","color-profile","cursor","discard","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","foreignobject","hatch","hatchpath","mesh","meshgradient","meshpatch","meshrow","missing-glyph","script","set","solidcolor","unknown","use"]),ee=b(["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmultiscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mspace","msqrt","mstyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover","mprescripts"]),to=b(["maction","maligngroup","malignmark","mlongdiv","mscarries","mscarry","msgroup","mstack","msline","msrow","semantics","annotation","annotation-xml","mprescripts","none"]),Be=b(["#text"]),We=b(["accept","action","align","alt","autocapitalize","autocomplete","autopictureinpicture","autoplay","background","bgcolor","border","capture","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","command","commandfor","controls","controlslist","coords","crossorigin","datetime","decoding","default","dir","disabled","disablepictureinpicture","disableremoteplayback","download","draggable","enctype","enterkeyhint","exportparts","face","for","headers","height","hidden","high","href","hreflang","id","inert","inputmode","integrity","ismap","kind","label","lang","list","loading","loop","low","max","maxlength","media","method","min","minlength","multiple","muted","name","nonce","noshade","novalidate","nowrap","open","optimum","part","pattern","placeholder","playsinline","popover","popovertarget","popovertargetaction","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","slot","span","srclang","start","src","srcset","step","style","summary","tabindex","title","translate","type","usemap","valign","value","width","wrap","xmlns"]),ne=b(["accent-height","accumulate","additive","alignment-baseline","amplitude","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clippathunits","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dominant-baseline","dur","edgemode","elevation","end","exponent","fill","fill-opacity","fill-rule","filter","filterunits","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","intercept","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","mask-type","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","points","preservealpha","preserveaspectratio","primitiveunits","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","slope","specularconstant","specularexponent","spreadmethod","startoffset","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","systemlanguage","tabindex","tablevalues","targetx","targety","transform","transform-origin","text-anchor","text-decoration","text-orientation","text-rendering","textlength","type","u1","u2","unicode","values","viewbox","visibility","version","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"]),Ye=b(["accent","accentunder","align","bevelled","close","columnalign","columnlines","columnspacing","columnspan","denomalign","depth","dir","display","displaystyle","encoding","fence","frame","height","href","id","largeop","length","linethickness","lquote","lspace","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"]),Dt=b(["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"]),eo=O(/{{[\w\W]*|^[\w\W]*}}/g),no=O(/<%[\w\W]*|^[\w\W]*%>/g),oo=O(/\${[\w\W]*/g),ro=O(/^data-[\-\w.\u00B7-\uFFFF]+$/),io=O(/^aria-[\-\w]+$/),je=O(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),ao=O(/^(?:\w+script|data):/i),so=O(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),lo=O(/^html$/i),co=O(/^[a-z][.\w]*(-[.\w]+)+$/i),$e=O(/<[/\w!]/g),Xe=O(/<[/\w]/g),uo=O(/<\/no(script|embed|frames)/i),fo=O(/\/>/i),P={element:1,attribute:2,text:3,cdataSection:4,entityReference:5,entityNode:6,processingInstruction:7,comment:8,document:9,documentType:10,documentFragment:11,notation:12},po=function(){return typeof window>"u"?null:window},mo=function(r,a){if(typeof r!="object"||typeof r.createPolicy!="function")return null;let l=null,f="data-tt-policy-suffix";a&&a.hasAttribute(f)&&(l=a.getAttribute(f));let m="dompurify"+(l?"#"+l:"");try{return r.createPolicy(m,{createHTML(R){return R},createScriptURL(R){return R}})}catch{return console.warn("TrustedTypes policy "+m+" could not be created."),null}},Ve=function(){return{afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}},j=function(r,a,l,f){return S(r,a)&&$(r[a])?p(f.base?L(f.base):{},r[a],f.transform):l};function Ze(){let o=arguments.length>0&&arguments[0]!==void 0?arguments[0]:po(),r=i=>Ze(i);if(r.version="3.4.12",r.removed=[],!o||!o.document||o.document.nodeType!==P.document||!o.Element)return r.isSupported=!1,r;let a=o.document,l=a,f=l.currentScript;o.DocumentFragment;let m=o.HTMLTemplateElement,R=o.Node,ct=o.Element,M=o.NodeFilter,ut=o.NamedNodeMap;ut===void 0&&(o.NamedNodeMap||o.MozNamedAttrMap),o.HTMLFormElement;let Lt=o.DOMParser,gt=o.trustedTypes,X=ct.prototype,Qe=H(X,"cloneNode"),wt=H(X,"remove"),tn=H(X,"nextSibling"),Q=H(X,"childNodes"),V=H(X,"parentNode"),ie=H(X,"shadowRoot"),Ct=H(X,"attributes"),I=R&&R.prototype?H(R.prototype,"nodeType"):null,v=R&&R.prototype?H(R.prototype,"nodeName"):null;if(typeof m=="function"){let i=a.createElement("template");i.content&&i.content.ownerDocument&&(a=i.content.ownerDocument)}let w,q="",Mt,ae=!1,ft=0,se=function(){if(ft>0)throw J('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.')},tt=function(t){se(),ft++;try{return w.createHTML(t)}finally{ft--}},en=function(t){se(),ft++;try{return w.createScriptURL(t)}finally{ft--}},nn=function(){return ae||(Mt=mo(gt,f),ae=!0),Mt},Et=a,Pt=Et.implementation,le=Et.createNodeIterator,on=Et.createDocumentFragment,rn=Et.getElementsByTagName,an=l.importNode,T=Ve();r.isSupported=typeof qe=="function"&&typeof V=="function"&&Pt&&Pt.createHTMLDocument!==void 0;let sn=eo,ln=no,cn=oo,un=ro,fn=io,pn=ao,ce=so,mn=co,ue=je,h=null,fe=p({},[...Ge,...Qt,...te,...ee,...Be]),_=null,pe=p({},[...We,...ne,...Ye,...Dt]),g=Object.seal(lt(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),pt=null,me=null,G=Object.seal(lt(null,{tagCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeCheck:{writable:!0,configurable:!1,enumerable:!0,value:null}})),de=!0,xt=!0,Te=!1,he=!0,B=!1,W=!0,K=!1,kt=!1,vt=null,Ut=null,Ft=!1,et=!1,At=!1,yt=!1,_e=!0,ge=!1,Ee="user-content-",zt=!0,Ht=!1,nt={},U=null,Gt=p({},["annotation-xml","audio","colgroup","desc","foreignobject","head","iframe","math","mi","mn","mo","ms","mtext","noembed","noframes","noscript","plaintext","script","selectedcontent","style","svg","template","thead","title","video","xmp"]),Ae=null,ye=p({},["audio","video","img","source","image","track"]),Bt=null,Se=p({},["alt","class","for","id","label","name","pattern","placeholder","role","summary","title","value","style","xmlns"]),St="http://www.w3.org/1998/Math/MathML",bt="http://www.w3.org/2000/svg",F="http://www.w3.org/1999/xhtml",ot=F,Wt=!1,Yt=null,dn=p({},[St,bt,F],Jt),be=b(["mi","mo","mn","ms","mtext"]),jt=p({},be),Oe=b(["annotation-xml"]),$t=p({},Oe),Tn=p({},["title","style","font","a","script"]),mt=null,hn=["application/xhtml+xml","text/html"],_n="text/html",d=null,rt=null,gn=a.createElement("form"),Re=function(t){return t instanceof RegExp||t instanceof Function},Xt=function(){let t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};if(rt&&rt===t)return;(!t||typeof t!="object")&&(t={}),t=L(t),mt=hn.indexOf(t.PARSER_MEDIA_TYPE)===-1?_n:t.PARSER_MEDIA_TYPE,d=mt==="application/xhtml+xml"?Jt:_t,h=j(t,"ALLOWED_TAGS",fe,{transform:d}),_=j(t,"ALLOWED_ATTR",pe,{transform:d}),Yt=j(t,"ALLOWED_NAMESPACES",dn,{transform:Jt}),Bt=j(t,"ADD_URI_SAFE_ATTR",Se,{transform:d,base:Se}),Ae=j(t,"ADD_DATA_URI_TAGS",ye,{transform:d,base:ye}),U=j(t,"FORBID_CONTENTS",Gt,{transform:d}),pt=j(t,"FORBID_TAGS",L({}),{transform:d}),me=j(t,"FORBID_ATTR",L({}),{transform:d}),nt=S(t,"USE_PROFILES")?t.USE_PROFILES&&typeof t.USE_PROFILES=="object"?L(t.USE_PROFILES):t.USE_PROFILES:!1,de=t.ALLOW_ARIA_ATTR!==!1,xt=t.ALLOW_DATA_ATTR!==!1,Te=t.ALLOW_UNKNOWN_PROTOCOLS||!1,he=t.ALLOW_SELF_CLOSE_IN_ATTR!==!1,B=t.SAFE_FOR_TEMPLATES||!1,W=t.SAFE_FOR_XML!==!1,K=t.WHOLE_DOCUMENT||!1,et=t.RETURN_DOM||!1,At=t.RETURN_DOM_FRAGMENT||!1,yt=t.RETURN_TRUSTED_TYPE||!1,Ft=t.FORCE_BODY||!1,_e=t.SANITIZE_DOM!==!1,ge=t.SANITIZE_NAMED_PROPS||!1,zt=t.KEEP_CONTENT!==!1,Ht=t.IN_PLACE||!1,ue=Jn(t.ALLOWED_URI_REGEXP)?t.ALLOWED_URI_REGEXP:je,ot=typeof t.NAMESPACE=="string"?t.NAMESPACE:F,jt=S(t,"MATHML_TEXT_INTEGRATION_POINTS")&&t.MATHML_TEXT_INTEGRATION_POINTS&&typeof t.MATHML_TEXT_INTEGRATION_POINTS=="object"?L(t.MATHML_TEXT_INTEGRATION_POINTS):p({},be),$t=S(t,"HTML_INTEGRATION_POINTS")&&t.HTML_INTEGRATION_POINTS&&typeof t.HTML_INTEGRATION_POINTS=="object"?L(t.HTML_INTEGRATION_POINTS):p({},Oe);let e=S(t,"CUSTOM_ELEMENT_HANDLING")&&t.CUSTOM_ELEMENT_HANDLING&&typeof t.CUSTOM_ELEMENT_HANDLING=="object"?L(t.CUSTOM_ELEMENT_HANDLING):lt(null);if(g=lt(null),S(e,"tagNameCheck")&&Re(e.tagNameCheck)&&(g.tagNameCheck=e.tagNameCheck),S(e,"attributeNameCheck")&&Re(e.attributeNameCheck)&&(g.attributeNameCheck=e.attributeNameCheck),S(e,"allowCustomizedBuiltInElements")&&typeof e.allowCustomizedBuiltInElements=="boolean"&&(g.allowCustomizedBuiltInElements=e.allowCustomizedBuiltInElements),O(g),B&&(xt=!1),At&&(et=!0),nt&&(h=p({},Be),_=lt(null),nt.html===!0&&(p(h,Ge),p(_,We)),nt.svg===!0&&(p(h,Qt),p(_,ne),p(_,Dt)),nt.svgFilters===!0&&(p(h,te),p(_,ne),p(_,Dt)),nt.mathMl===!0&&(p(h,ee),p(_,Ye),p(_,Dt))),G.tagCheck=null,G.attributeCheck=null,S(t,"ADD_TAGS")&&(typeof t.ADD_TAGS=="function"?G.tagCheck=t.ADD_TAGS:$(t.ADD_TAGS)&&(h===fe&&(h=L(h)),p(h,t.ADD_TAGS,d))),S(t,"ADD_ATTR")&&(typeof t.ADD_ATTR=="function"?G.attributeCheck=t.ADD_ATTR:$(t.ADD_ATTR)&&(_===pe&&(_=L(_)),p(_,t.ADD_ATTR,d))),S(t,"ADD_URI_SAFE_ATTR")&&$(t.ADD_URI_SAFE_ATTR)&&p(Bt,t.ADD_URI_SAFE_ATTR,d),S(t,"FORBID_CONTENTS")&&$(t.FORBID_CONTENTS)&&(U===Gt&&(U=L(U)),p(U,t.FORBID_CONTENTS,d)),S(t,"ADD_FORBID_CONTENTS")&&$(t.ADD_FORBID_CONTENTS)&&(U===Gt&&(U=L(U)),p(U,t.ADD_FORBID_CONTENTS,d)),zt&&(h["#text"]=!0),K&&p(h,["html","head","body"]),h.table&&(p(h,["tbody"]),delete pt.tbody),t.TRUSTED_TYPES_POLICY){if(typeof t.TRUSTED_TYPES_POLICY.createHTML!="function")throw J('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');if(typeof t.TRUSTED_TYPES_POLICY.createScriptURL!="function")throw J('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');let n=w;w=t.TRUSTED_TYPES_POLICY;try{q=tt("")}catch(s){throw w=n,s}}else t.TRUSTED_TYPES_POLICY===null?(w=void 0,q=""):(w===void 0&&(w=nn()),w&&typeof q=="string"&&(q=tt("")));b&&b(t),rt=t},Ne=p({},[...Qt,...te,...Qn]),Ie=p({},[...ee,...to]),En=function(t,e,n){return e.namespaceURI===F?t==="svg":e.namespaceURI===St?t==="svg"&&(n==="annotation-xml"||jt[n]):!!Ne[t]},An=function(t,e,n){return e.namespaceURI===F?t==="math":e.namespaceURI===bt?t==="math"&&$t[n]:!!Ie[t]},yn=function(t,e,n){return e.namespaceURI===bt&&!$t[n]||e.namespaceURI===St&&!jt[n]?!1:!Ie[t]&&(Tn[t]||!Ne[t])},Sn=function(t){let e=V(t);(!e||!e.tagName)&&(e={namespaceURI:ot,tagName:"template"});let n=_t(t.tagName),s=_t(e.tagName);return Yt[t.namespaceURI]?t.namespaceURI===bt?En(n,e,s):t.namespaceURI===St?An(n,e,s):t.namespaceURI===F?yn(n,e,s):!!(mt==="application/xhtml+xml"&&Yt[t.namespaceURI]):!1},Y=function(t){st(r.removed,{element:t});try{V(t).removeChild(t)}catch{if(wt(t),!V(t))throw J("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place")}},Ot=function(t){Vt(t);let e=Q(t);if(e){let s=[];at(e,c=>{st(s,c)}),at(s,c=>{try{wt(c)}catch{}})}let n=Ct(t);if(n)for(let s=n.length-1;s>=0;--s){let c=n[s],u=c&&c.name;if(typeof u=="string")try{t.removeAttribute(u)}catch{}}},Z=function(t,e){try{st(r.removed,{attribute:e.getAttributeNode(t),from:e})}catch{st(r.removed,{attribute:null,from:e})}if(e.removeAttribute(t),t==="is")if(et||At)try{Y(e)}catch{}else try{e.setAttribute(t,"")}catch{}},bn=function(t){let e=Ct(t);if(e)for(let n=e.length-1;n>=0;--n){let s=e[n],c=s&&s.name;if(!(typeof c!="string"||_[d(c)]))try{t.removeAttribute(c)}catch{}}},Vt=function(t){let e=[t];for(;e.length>0;){let n=e.pop();(I?I(n):n.nodeType)===P.element&&bn(n);let c=Q(n);if(c)for(let u=c.length-1;u>=0;--u)e.push(c[u])}},On=function(t){if(!W)return;let e=[t];for(;e.length>0;){let n=e.pop(),s=I?I(n):n.nodeType;if(s===P.processingInstruction||s===P.comment&&y(Xe,n.data)){try{wt(n)}catch{}continue}if(s===P.element){let u=n,E=d(v?v(n):n.nodeName);try{u.hasAttribute&&u.hasAttribute("patchsrc")&&u.removeAttribute("patchsrc"),u.hasAttribute&&u.hasAttribute("for")&&E!=="label"&&E!=="output"&&u.removeAttribute("for")}catch{}}let c=Q(n);if(c)for(let u=c.length-1;u>=0;--u)e.push(c[u])}},De=function(t){let e=null,n=null;if(Ft)t="<remove></remove>"+t;else{let u=Ue(t,/^[\r\n\t ]+/);n=u&&u[0]}mt==="application/xhtml+xml"&&ot===F&&(t='<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>'+t+"</body></html>");let s=w?tt(t):t;if(ot===F)try{e=new Lt().parseFromString(s,mt)}catch{}if(!e||!e.documentElement){e=Pt.createDocument(ot,"template",null);try{e.documentElement.innerHTML=Wt?q:s}catch{}}let c=e.body||e.documentElement;return t&&n&&c.insertBefore(a.createTextNode(n),c.childNodes[0]||null),ot===F?rn.call(e,K?"html":"body")[0]:K?e.documentElement:c},Le=function(t){return le.call(t.ownerDocument||t,t,M.SHOW_ELEMENT|M.SHOW_COMMENT|M.SHOW_TEXT|M.SHOW_PROCESSING_INSTRUCTION|M.SHOW_CDATA_SECTION,null)},Rt=function(t){return t=Tt(t,sn," "),t=Tt(t,ln," "),t=Tt(t,cn," "),t},qt=function(t){var e;t.normalize();let n=le.call(t.ownerDocument||t,t,M.SHOW_TEXT|M.SHOW_COMMENT|M.SHOW_CDATA_SECTION|M.SHOW_PROCESSING_INSTRUCTION,null),s=n.nextNode();for(;s;)s.data=Rt(s.data),s=n.nextNode();let c=(e=t.querySelectorAll)===null||e===void 0?void 0:e.call(t,"template");c&&at(c,u=>{it(u.content)&&qt(u.content)})},Nt=function(t){let e=v?v(t):null;return typeof e!="string"||d(e)!=="form"?!1:typeof t.nodeName!="string"||typeof t.textContent!="string"||typeof t.removeChild!="function"||t.attributes!==Ct(t)||typeof t.removeAttribute!="function"||typeof t.setAttribute!="function"||typeof t.namespaceURI!="string"||typeof t.insertBefore!="function"||typeof t.hasChildNodes!="function"||t.nodeType!==I(t)||t.childNodes!==Q(t)},it=function(t){if(!I||typeof t!="object"||t===null)return!1;try{return I(t)===P.documentFragment}catch{return!1}},dt=function(t){if(!I||typeof t!="object"||t===null)return!1;try{return typeof I(t)=="number"}catch{return!1}};function z(i,t,e){i.length!==0&&at(i,n=>{n.call(r,t,e,rt)})}let Rn=function(t,e){return!!(W&&t.hasChildNodes()&&!dt(t.firstElementChild)&&y($e,t.textContent)&&y($e,t.innerHTML)||W&&t.namespaceURI===F&&e==="style"&&dt(t.firstElementChild)||t.nodeType===P.processingInstruction||W&&t.nodeType===P.comment&&y(Xe,t.data))},Nn=function(t,e){if(!pt[e]&&Me(e)&&(g.tagNameCheck instanceof RegExp&&y(g.tagNameCheck,e)||g.tagNameCheck instanceof Function&&g.tagNameCheck(e)))return!1;if(zt&&!U[e]){let n=V(t),s=Q(t);if(s&&n){let c=s.length;for(let u=c-1;u>=0;--u){let E=Ht?s[u]:Qe(s[u],!0);n.insertBefore(E,tn(t))}}}return Y(t),!0},we=function(t,e){if(z(T.beforeSanitizeElements,t,null),t!==e&&V(t)===null)return!0;if(Nt(t))return Y(t),!0;let n=d(v?v(t):t.nodeName);if(z(T.uponSanitizeElement,t,{tagName:n,allowedTags:h}),t!==e&&V(t)===null)return!0;if(Rn(t,n))return Y(t),!0;if(pt[n]||!(G.tagCheck instanceof Function&&G.tagCheck(n))&&!h[n]){let c=Nn(t,n);return c===!1&&z(T.afterSanitizeElements,t,null),c}if((I?I(t):t.nodeType)===P.element&&!Sn(t)||(n==="noscript"||n==="noembed"||n==="noframes")&&y(uo,t.innerHTML))return Y(t),!0;if(B&&t.nodeType===P.text){let c=Rt(t.textContent);t.textContent!==c&&(st(r.removed,{element:t.cloneNode()}),t.textContent=c)}return z(T.afterSanitizeElements,t,null),!1},Ce=function(t,e,n){if(me[e]||W&&e==="patchsrc"||W&&e==="for"&&t!=="label"&&t!=="output"||_e&&(e==="id"||e==="name")&&(n in a||n in gn))return!1;let s=_[e]||G.attributeCheck instanceof Function&&G.attributeCheck(e,t);if(!(xt&&y(un,e))){if(!(de&&y(fn,e))){if(s){if(!Bt[e]){if(!y(ue,Tt(n,ce,""))){if(!((e==="src"||e==="xlink:href"||e==="href")&&t!=="script"&&Fe(n,"data:")===0&&Ae[t])){if(!(Te&&!y(pn,Tt(n,ce,"")))){if(n)return!1}}}}}else if(!(Me(t)&&(g.tagNameCheck instanceof RegExp&&y(g.tagNameCheck,t)||g.tagNameCheck instanceof Function&&g.tagNameCheck(t))&&(g.attributeNameCheck instanceof RegExp&&y(g.attributeNameCheck,e)||g.attributeNameCheck instanceof Function&&g.attributeNameCheck(e,t))||e==="is"&&g.allowCustomizedBuiltInElements&&(g.tagNameCheck instanceof RegExp&&y(g.tagNameCheck,n)||g.tagNameCheck instanceof Function&&g.tagNameCheck(n))))return!1}}return!0},In=p({},["annotation-xml","color-profile","font-face","font-face-format","font-face-name","font-face-src","font-face-uri","missing-glyph"]),Me=function(t){return!In[_t(t)]&&y(mn,t)},Dn=function(t,e,n,s){if(w&&typeof gt=="object"&&typeof gt.getAttributeType=="function"&&!n)switch(gt.getAttributeType(t,e)){case"TrustedHTML":return tt(s);case"TrustedScriptURL":return en(s)}return s},Ln=function(t,e,n,s){try{n?t.setAttributeNS(n,e,s):t.setAttribute(e,s),Nt(t)?Y(t):ve(r.removed)}catch{Z(e,t)}},Pe=function(t){z(T.beforeSanitizeAttributes,t,null);let e=t.attributes;if(!e||Nt(t))return;let n={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:_,forceKeepAttr:void 0},s=e.length,c=d(t.nodeName);for(;s--;){let u=e[s],E=u.name,N=u.namespaceURI,x=u.value,C=d(E),k=x,D=E==="value"?k:$n(k);if(n.attrName=C,n.attrValue=D,n.keepAttr=!0,n.forceKeepAttr=void 0,z(T.uponSanitizeAttribute,t,n),D=n.attrValue,ge&&(C==="id"||C==="name")&&Fe(D,Ee)!==0&&(Z(E,t),D=Ee+D),W&&y(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i,D)){Z(E,t);continue}if(C==="attributename"&&Ue(D,"href")){Z(E,t);continue}if(!n.forceKeepAttr){if(!n.keepAttr){Z(E,t);continue}if(!he&&y(fo,D)){Z(E,t);continue}if(B&&(D=Rt(D)),!Ce(c,C,D)){Z(E,t);continue}D=Dn(c,C,N,D),D!==k&&Ln(t,E,N,D)}}z(T.afterSanitizeAttributes,t,null)},It=function(t){let e=null,n=Le(t);for(z(T.beforeSanitizeShadowDOM,t,null);e=n.nextNode();)if(z(T.uponSanitizeShadowNode,e,null),we(e,t),Pe(e),it(e.content)&&It(e.content),(I?I(e):e.nodeType)===P.element){let c=ie(e);it(c)&&(Kt(c),It(c))}z(T.afterSanitizeShadowDOM,t,null)},Kt=function(t){let e=[{node:t,shadow:null}];for(;e.length>0;){let n=e.pop();if(n.shadow){It(n.shadow);continue}let s=n.node,u=(I?I(s):s.nodeType)===P.element,E=Q(s);if(E)for(let N=E.length-1;N>=0;--N)e.push({node:E[N],shadow:null});if(u){let N=v?v(s):null;if(typeof N=="string"&&d(N)==="template"){let x=s.content;it(x)&&e.push({node:x,shadow:null})}}if(u){let N=ie(s);it(N)&&e.push({node:null,shadow:N},{node:N,shadow:null})}}};return r.sanitize=function(i){let t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},e=null,n=null,s=null,c=null;if(Wt=!i,Wt&&(i="<!-->"),typeof i!="string"&&!dt(i)&&(i=Zn(i),typeof i!="string"))throw J("dirty is not a string, aborting");if(!r.isSupported)return i;kt?(h=vt,_=Ut):Xt(t),(T.uponSanitizeElement.length>0||T.uponSanitizeAttribute.length>0)&&(h=L(h)),T.uponSanitizeAttribute.length>0&&(_=L(_)),r.removed=[];let u=Ht&&typeof i!="string"&&dt(i);if(u){On(i);let C=v?v(i):i.nodeName;if(typeof C=="string"){let k=d(C);if(!h[k]||pt[k])throw Ot(i),J("root node is forbidden and cannot be sanitized in-place")}if(Nt(i))throw Ot(i),J("root node is clobbered and cannot be sanitized in-place");try{Kt(i)}catch(k){throw Ot(i),k}}else if(dt(i))e=De("<!---->"),n=e.ownerDocument.importNode(i,!0),n.nodeType===P.element&&n.nodeName==="BODY"||n.nodeName==="HTML"?e=n:e.appendChild(n),Kt(n);else{if(!et&&!B&&!K&&i.indexOf("<")===-1)return w&&yt?tt(i):i;if(e=De(i),!e)return et?null:yt?q:""}e&&Ft&&Y(e.firstChild);let E=u?i:e,N=Le(E);try{for(;s=N.nextNode();)we(s,E),Pe(s),it(s.content)&&It(s.content)}catch(C){throw u&&(Ot(i),at(r.removed,k=>{k.element&&Vt(k.element)})),C}if(u)return at(r.removed,C=>{C.element&&Vt(C.element)}),B&&qt(i),i;if(et){if(B&&qt(e),At)for(c=on.call(e.ownerDocument);e.firstChild;)c.appendChild(e.firstChild);else c=e;return(_.shadowroot||_.shadowrootmode)&&(c=an.call(l,c,!0)),c}let x=K?e.outerHTML:e.innerHTML;return K&&h["!doctype"]&&e.ownerDocument&&e.ownerDocument.doctype&&e.ownerDocument.doctype.name&&y(lo,e.ownerDocument.doctype.name)&&(x="<!DOCTYPE "+e.ownerDocument.doctype.name+`>
    `+x),B&&(x=Rt(x)),w&&yt?tt(x):x},r.setConfig=function(){let i=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};Xt(i),kt=!0,vt=h,Ut=_},r.clearConfig=function(){rt=null,kt=!1,vt=null,Ut=null,w=Mt,q=""},r.isValidAttribute=function(i,t,e){rt||Xt({});let n=d(i),s=d(t);return Ce(n,s,e)},r.addHook=function(i,t){typeof t=="function"&&S(T,i)&&st(T[i],t)},r.removeHook=function(i,t){if(S(T,i)){if(t!==void 0){let e=Yn(T[i],t);return e===-1?void 0:jn(T[i],e,1)[0]}return ve(T[i])}},r.removeHooks=function(i){S(T,i)&&(T[i]=[])},r.removeAllHooks=function(){T=Ve()},r}var Je=Ze();

  return module.exports;
})();

const SLICE_CLASS_FACTORY_SliceComponent_ConfirmActionModal = () => {
  // A single reusable confirmation dialog, owning one Modal instance appended
  // to <body> — the Provider-Service pattern (same shape as ToastProvider):
  // the singleton service owns the Visual, so "one app-wide modal" doesn't
  // mean re-building a Modal per call site.
  //
  // The Modal itself is built LAZILY, on the first actual confirm:request —
  // same as ToastProvider's _getContainer(), which only touches the DOM on
  // its first .show(). Building it eagerly in init() would insert a (closed,
  // invisible) <dialog> into <body> the instant the app boots, before any
  // user action ever asks for a confirmation — surprising to find in devtools
  // and pure waste for the common case where a session never needs it.
  //
  // Driven entirely by events, so ANY component can ask for a confirmation
  // without holding a reference to this instance or to the Modal itself:
  //
  //   slice.events.emit('confirm:request', {
  //     title: '¿Reiniciar tus asignaciones?',
  //     message: 'No afecta los JSON ya exportados.',
  //     confirmLabel: 'Reiniciar',
  //     danger: true,
  //     onConfirm: () => respuestasService.reset(),
  //   });
  //
  // Pass inputLabel to also collect a single text value — onConfirm then
  // receives it (trimmed) as its argument instead of being called with none:
  //
  //   slice.events.emit('confirm:request', {
  //     title: '¿Cuál es tu nombre?',
  //     confirmLabel: 'Exportar',
  //     inputLabel: 'Tu nombre',
  //     inputPlaceholder: '¿Quién asigna?',
  //     onConfirm: (name) => settingsService.setAutor(name),
  //   });
  //
  // onConfirm/onCancel are plain callbacks in the event payload — fine since
  // events are an in-memory, synchronous pub/sub, not persisted state (unlike
  // slice.context, which must stay serializable).
  class ConfirmActionModal {
    init() {
      this._resolved = false;
      slice.events.subscribe('confirm:request', (payload) => this._open(payload));
    }
  
    // Guarded by an in-flight PROMISE, not a `this.$modal` truthiness check —
    // two confirm:request events arriving before the first build resolves
    // would otherwise both pass a flag check and both call slice.build with
    // the same fixed sliceId, and the second throws ("already registered").
    // Assigning the promise is synchronous (no await between the check and
    // the assignment), so this is race-safe even though _buildModal itself
    // awaits internally.
    async _ensureModal() {
      if (!this._modalPromise) this._modalPromise = this._buildModal();
      await this._modalPromise;
    }
  
    async _buildModal() {
      this.$modal = await slice.build('Modal', {
        sliceId: 'confirm-action-dialog',
        dismissable: true,
        onClose: () => this._handleClose(),
      });
      this.$modal.classList.add('confirm-modal');
      document.body.appendChild(this.$modal);
  
      this.$message = document.createElement('p');
      this.$message.className = 'confirm-modal__message';
      this.$modal.appendBody(this.$message);
  
      this.$cancelBtn = await slice.build('Button', {
        value: 'Cancelar',
        variant: 'ghost',
        onClick: () => this._resolve(false)
      });
  
      this.$confirmBtn = await slice.build('Button', {
        value: 'Confirmar',
        variant: 'filled',
        onClick: () => this._resolve(true)
      });
  
      this.$modal.appendFooter(this.$cancelBtn);
      this.$modal.appendFooter(this.$confirmBtn);
    }
  
    // Same in-flight-promise guard as _ensureModal, and for the same reason —
    // built lazily on the first confirm:request that actually asks for input.
    async _ensureInput() {
      if (!this._inputPromise) this._inputPromise = this._buildInput();
      await this._inputPromise;
    }
  
    async _buildInput() {
      this.$inputLabel = document.createElement('label');
      this.$inputLabel.className = 'confirm-modal__field';
      this.$inputSpan = document.createElement('span');
      this.$inputLabel.appendChild(this.$inputSpan);
      this.$modal.appendBody(this.$inputLabel);
      this.$input = await slice.build('Input', { sliceId: 'confirm-action-input' });
      this.$input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._resolve(true);
      });
      this.$inputLabel.appendChild(this.$input);
    }
  
    async _open({
      title = '¿Confirmas esta acción?',
      message = '',
      confirmLabel = 'Confirmar',
      cancelLabel = 'Cancelar',
      danger = false,
      inputLabel = null,
      inputPlaceholder = '',
      inputValue = '',
      onConfirm,
      onCancel,
    } = {}) {
      await this._ensureModal();
  
      this._onConfirm = onConfirm;
      this._onCancel = onCancel;
      this._resolved = false;
      this._hasInput = !!inputLabel;
  
      this.$modal.title = title;
      this.$message.textContent = message;
      this.$message.hidden = !message;
      this.$cancelBtn.value = cancelLabel;
      this.$confirmBtn.value = confirmLabel;
      if (danger) {
        this.$confirmBtn.variant = 'filled';
        this.$confirmBtn.customColor = { background: 'var(--danger-color)', text: 'var(--danger-contrast)' };
      } else {
        this.$confirmBtn.variant = 'filled';
        this.$confirmBtn.customColor = { background: '', text: '' };
        var btn = this.$confirmBtn.querySelector('.slice_button');
        if (btn) {
          btn.style.backgroundColor = '';
          btn.style.borderColor = '';
          btn.style.color = '';
        }
      }
  
      if (this._hasInput) {
        await this._ensureInput();
        this.$inputLabel.hidden = false;
        this.$inputSpan.textContent = inputLabel;
        this.$input.placeholder = inputPlaceholder;
        this.$input.value = inputValue;
      } else if (this.$inputLabel) {
        this.$inputLabel.hidden = true;
      }
  
      this.$modal.open = true;
      if (this._hasInput) {
        requestAnimationFrame(() => this.$input.querySelector('input').focus());
      }
    }
  
    _resolve(confirmed) {
      this._resolved = true;
      const callback = confirmed ? this._onConfirm : this._onCancel;
      const arg = confirmed && this._hasInput ? this.$input.value.trim() : undefined;
      this.$modal.open = false;
      callback?.(arg);
    }
  
    // The native <dialog> also closes via Escape or a backdrop click — treat
    // that as an implicit cancel, unless a button already resolved it (Modal's
    // onClose fires on every close path, including close() called by _resolve).
    _handleClose() {
      if (!this._resolved) this._onCancel?.();
      this._resolved = false;
    }
  }
  
  window.ConfirmActionModal = ConfirmActionModal;
  return ConfirmActionModal;
};

const SLICE_CLASS_FACTORY_SliceComponent_ConsensoService = () => {
  // Context is created ONCE in init() via StoreService.ensure() — boot order
  // guarantees init runs before any consumer, so no per-method defensive ensure.
  //
  // Owns the `decisionFinal` context: { seleccion: {[opcionId]: temaId},
  // texto: {[temaId]: {autor, texto}} } — the manually overridden
  // "Final" decisions in Comparar, kept separate from the user's own
  // `respuestas` context. Mirrors `respuestas`' seleccion/texto split (Fase A
  // design correction) for the same reason: seleccion is naturally indexed by
  // Opción (many Opciones per Tema), texto is naturally indexed by
  // Tema (one chosen answer per question). Rows for `seleccion` methods
  // come from CompareView: { opcion, vals: temaId[] } (opcion here is
  // really an Opción — kept named `opcion` in the row shape, unchanged from
  // the source app).
  const CONTEXT = 'decisionFinal';
  const STORAGE_KEY = 'conclave-decision-final-v1';
  // Mirrors respuestas' split: seleccion (reparto) + texto (texto_libre) + voto
  // (votacion, one chosen opción per tema) + ranking (ordered opción ids per
  // tema). Returning users predate voto/ranking — reads default them.
  const INITIAL_STATE = { seleccion: {}, texto: {}, voto: {}, ranking: {} };
  
  class ConsensoService {
    init() {
      slice.getComponent('StoreService').ensure(CONTEXT, INITIAL_STATE, STORAGE_KEY);
    }
  
    getState() {
      return slice.context.getState(CONTEXT);
    }
  
    // ── Modo selección ──────────────────────────────────────────
  
    hasResolution(opcionId) {
      return Object.prototype.hasOwnProperty.call(this.getState().seleccion, opcionId);
    }
  
    // Majority vote across proposed values; ties broken by first-encountered order.
    suggestFinal(row) {
      const tally = {};
      row.vals.forEach((v) => { if (v) tally[v] = (tally[v] || 0) + 1; });
      let best = null, bestN = 0;
      row.vals.forEach((v) => { if (v && tally[v] > bestN) { best = v; bestN = tally[v]; } });
      return best;
    }
  
    // Manual override if present, otherwise the majority suggestion.
    finalFor(row) {
      if (this.hasResolution(row.opcion.id)) return this.getState().seleccion[row.opcion.id] || null;
      return this.suggestFinal(row);
    }
  
    setResolution(opcionId, temaId) {
      slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: { ...prev.seleccion, [opcionId]: temaId } }));
    }
  
    fillAllWithSuggestion(rows) {
      const updates = {};
      rows.forEach((row) => {
        const f = this.finalFor(row);
        if (f) updates[row.opcion.id] = f;
      });
      slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: { ...prev.seleccion, ...updates } }));
    }
  
    clearAll() {
      slice.context.setState(CONTEXT, (prev) => ({ ...prev, seleccion: {} }));
    }
  
    // ── Modo texto_libre ────────────────────────────────────────
  
    hasResolutionTexto(temaId) {
      return Object.prototype.hasOwnProperty.call(this.getState().texto, temaId);
    }
  
    // "Final" for a texto_libre tema = one author's exact proposal
    // adopted as-is (mirrors the seleccion majority-pick UX, no merge/synthesis
    // editor in this phase).
    finalTextoFor(temaId) {
      return this.getState().texto[temaId] || null;
    }
  
    setResolutionTexto(temaId, autor, texto) {
      slice.context.setState(CONTEXT, (prev) => ({ ...prev, texto: { ...prev.texto, [temaId]: { autor, texto } } }));
    }
  
    clearResolutionTexto(temaId) {
      slice.context.setState(CONTEXT, (prev) => {
        const texto = { ...prev.texto };
        delete texto[temaId];
        return { ...prev, texto };
      });
    }
  
    // ── Modo votacion ───────────────────────────────────────────
    // Final = one Opción adopted per tema (manual override or, later, the
    // majority pick computed in the votacion compare view — Fase 2).
    finalVotoFor(temaId) {
      return this.getState().voto?.[temaId] || null;
    }
  
    setResolutionVoto(temaId, opcionId) {
      slice.context.setState(CONTEXT, (prev) => ({ ...prev, voto: { ...(prev.voto || {}), [temaId]: opcionId } }));
    }
  
    clearResolutionVoto(temaId) {
      slice.context.setState(CONTEXT, (prev) => {
        const voto = { ...(prev.voto || {}) };
        delete voto[temaId];
        return { ...prev, voto };
      });
    }
  
    // ── Modo ranking ────────────────────────────────────────────
    finalRankingFor(temaId) {
      return this.getState().ranking?.[temaId] || [];
    }
  
    setResolutionRanking(temaId, opcionIds) {
      const list = Array.isArray(opcionIds) ? opcionIds : [];
      slice.context.setState(CONTEXT, (prev) => ({ ...prev, ranking: { ...(prev.ranking || {}), [temaId]: list } }));
    }
  
    clearResolutionRanking(temaId) {
      slice.context.setState(CONTEXT, (prev) => {
        const ranking = { ...(prev.ranking || {}) };
        delete ranking[temaId];
        return { ...prev, ranking };
      });
    }
  
    // ── Export ──────────────────────────────────────────────────
  
    exportFinal(rows) {
      const seleccion = {};
      rows.forEach((row) => {
        const f = this.finalFor(row);
        if (f) seleccion[row.opcion.id] = f;
      });
      const state = this.getState();
      const texto = {};
      Object.entries(state.texto).forEach(([temaId, entry]) => {
        if (entry?.texto) texto[temaId] = entry.texto;
      });
      const voto = { ...(state.voto || {}) };
      const ranking = { ...(state.ranking || {}) };
      const autor = slice.getComponent('SettingsService').getState().autor || 'Consenso';
      slice.getComponent('ExportService').downloadRespuestasFinal(autor, { seleccion, texto, voto, ranking });
    }
  
    // Exports the full state as JSON (used by ResumenFinalView).
    exportStateJson() {
      var autor = slice.getComponent('SettingsService').getState().autor || 'Consenso';
      slice.getComponent('ExportService').downloadRespuestasFinal(autor, this.getState());
    }
  
    // Imports consensus state from a parsed JSON object.
    // Returns true if the state was valid and loaded.
    importState(data) {
      if (!data || typeof data !== 'object') return false;
      // Handle envelope format: { respuestas: { seleccion, texto, voto, ranking } }
      const src = data.respuestas || data;
      if (!src || typeof src !== 'object') return false;
      var state = {};
      ['seleccion', 'texto', 'voto', 'ranking'].forEach(function (key) {
        state[key] = (src[key] && typeof src[key] === 'object') ? src[key] : {};
      });
      slice.context.setState(CONTEXT, function () { return state; });
      return true;
    }
  
    // ── HTML / PDF export ──────────────────────────────────────
  
    exportHtml() {
      const html = this._buildExportDoc();
      slice.getComponent('FileDownloadService').download('resumen_final.html', html, 'text/html');
    }
  
    exportPdf() {
      const html = this._buildExportDoc();
      slice.getComponent('FileDownloadService').download('resumen_final.html', html, 'text/html');
    }
  
    exportPrint() {
      const html = this._buildExportDoc();
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(function () {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(function () { document.body.removeChild(iframe); }, 500);
      }, 200);
    }
  
    _buildExportDoc() {
      const roster = slice.getComponent('PlantillaService');
      const h = slice.getComponent('HtmlService');
      const temas = roster.getTemas();
      const state = this.getState();
      const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  
      const parts = [];
      parts.push(this._buildReparto(temas, state, roster, h));
      parts.push(this._buildVotacion(temas, state, roster, h));
      parts.push(this._buildRanking(temas, state, roster, h));
      parts.push(this._buildTexto(temas, state, roster, h));
      const bodyHtml = parts.filter(Boolean).join('\n');
  
      return '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>Resumen del consenso final \u2014 Conclave</title>\n<style>\n*,*::before,*::after{box-sizing:border-box}\nbody{font-family:\'Segoe UI\',system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1a1a1a;background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}\nh1{font-size:28px;margin:0 0 4px}\n.meta{color:#666;font-size:14px;margin:0 0 36px}\nh2{font-size:20px;font-weight:700;margin:32px 0 16px;padding-bottom:8px;border-bottom:3px solid #e85d4a}\ntable{width:100%;border-collapse:collapse;margin-bottom:24px}\nth,td{text-align:left;padding:10px 14px;border-bottom:1px solid #e0e0e0}\nth{font-weight:700;text-transform:uppercase;font-size:11px;color:#888;letter-spacing:.04em}\n.cards{display:flex;flex-direction:column;gap:12px;margin-bottom:24px}\n.card{background:#f7f7f7;border-radius:12px;padding:16px 20px}\n.card h3{margin:0 0 6px;font-size:16px;font-weight:700}\n.card-body{font-size:14px;color:#333}\n.card-body.empty{color:#aaa;font-style:italic}\n.rank-list{list-style:none;padding:0;margin:8px 0 0}\n.rank-item{display:flex;align-items:center;gap:10px;padding:6px 0}\n.rank-pos{display:inline-flex;width:26px;height:26px;border-radius:50%;background:#e85d4a;color:#fff;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}\n.quote{font-style:italic;background:#f0f0f0;padding:14px 18px;border-left:4px solid #e85d4a;border-radius:8px;margin:6px 0 0}
  .md-render p{margin:0 0 6px}
  .md-render p:last-child{margin:0}
  .md-render ul,.md-render ol{margin:4px 0;padding-left:1.5em}
  .md-render li{margin-bottom:2px}\n.quote-autor{font-size:12px;color:#888;font-weight:600;font-style:normal;margin-top:8px;display:block}\n.empty{color:#aaa;font-style:italic;font-size:14px}\n@media print{body{margin:0;padding:20px}h2{break-after:avoid}.card{break-inside:avoid}}\n</style>\n</head>\n<body>\n<h1>Resumen del consenso final</h1>\n<p class="meta">Generado el ' + h.esc(date) + ' por Conclave</p>\n' + bodyHtml + '\n</body>\n</html>';
    }
  
    _buildReparto(temas, state, roster, h) {
      const repartoTemas = temas.filter(function (t) { return t.modo === 'reparto'; });
      if (!repartoTemas.length) return '';
      const sel = state.seleccion || {};
      const opcionesConTema = Object.entries(sel).filter(function (entry) { return repartoTemas.some(function (t) { return t.id === entry[1]; }); });
      if (!opcionesConTema.length) return '<h2>Asignaciones</h2><p class="empty">No hay decisiones finales de asignaci\u00f3n.</p>';
  
      const rows = opcionesConTema.map(function (entry) {
        var opcion = roster.getOpcionById(entry[0]);
        var tema = repartoTemas.find(function (t) { return t.id === entry[1]; });
        return '<tr><td>' + h.esc(opcion ? opcion.nombre : entry[0]) + '</td><td>' + h.esc(tema ? tema.nombre : entry[1]) + '</td></tr>';
      }).join('');
      return '<h2>Asignaciones</h2><table><thead><tr><th>Persona</th><th>Asignado a</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
  
    _buildVotacion(temas, state, roster, h) {
      var votacionTemas = temas.filter(function (t) { return t.modo === 'votacion'; });
      if (!votacionTemas.length) return '';
      var voto = state.voto || {};
  
      var cards = votacionTemas.map(function (tema) {
        var finalOpcionId = voto[tema.id];
        var opcion = finalOpcionId ? roster.getOpcionById(finalOpcionId) : null;
        return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><div class="card-body">' + (opcion ? '<strong>' + h.esc(opcion.nombre) + '</strong>' : '<span class="empty">Sin decidir</span>') + '</div></div>';
      }).join('');
      return '<h2>Votaciones</h2><div class="cards">' + cards + '</div>';
    }
  
    _buildRanking(temas, state, roster, h) {
      var rankingTemas = temas.filter(function (t) { return t.modo === 'ranking'; });
      if (!rankingTemas.length) return '';
      var ranking = state.ranking || {};
  
      var cards = rankingTemas.map(function (tema) {
        var order = ranking[tema.id];
        if (!Array.isArray(order) || !order.length) {
          return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><div class="card-body empty">Sin orden final</div></div>';
        }
        var items = order.map(function (id, idx) {
          var opcion = roster.getOpcionById(id);
          return '<li class="rank-item"><span class="rank-pos">' + (idx + 1) + '</span><span>' + h.esc(opcion ? opcion.nombre : id) + '</span></li>';
        }).join('');
        return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><ol class="rank-list">' + items + '</ol></div>';
      }).join('');
      return '<h2>Rankings</h2><div class="cards">' + cards + '</div>';
    }
  
    _buildTexto(temas, state, roster, h) {
      var textoTemas = temas.filter(function (t) { return t.modo === 'texto_libre'; });
      if (!textoTemas.length) return '';
      var texto = state.texto || {};
  
      var cards = textoTemas.map(function (tema) {
        var entry = texto[tema.id];
        return '<div class="card"><h3>' + h.esc(tema.nombre) + '</h3><div class="card-body">' + (entry && entry.texto ? '<div class="quote md-render">' + h.markdownToHtml(entry.texto) + '<span class="quote-autor">\u2014 ' + h.esc(entry.autor || '') + '</span></div>' : '<span class="empty">Sin texto adoptado</span>') + '</div></div>';
      }).join('');
      return '<h2>Texto libre</h2><div class="cards">' + cards + '</div>';
    }
  }
  
  window.ConsensoService = ConsensoService;
  return ConsensoService;
};

const SLICE_CLASS_FACTORY_SliceComponent_DashboardView = () => {
  class DashboardView extends HTMLElement {
    constructor(props) {
      super();
      slice.attachTemplate(this);
      this.$root = this.querySelector('.dashboard-view');
      slice.controller.setComponentProps(this, props);
    }
  
    async init() {
      this._roster = slice.getComponent('PlantillaService');
      this._html = slice.getComponent('HtmlService');
      this._charts = slice.getComponent('ChartService');
      await this._buildShell();
      this._render();
      slice.context.watch('respuestas', this, () => this._render());
      slice.context.watch('settings', this, () => this._render());
      // A modo change / add / rename / import changes the SHAPE (which sections
      // exist), so the shell is rebuilt when needed, not just re-rendered.
      slice.context.watch('plantilla', this, () => this._rebuildIfNeeded());
    }
  
    update() {
      // Cached revisit: rebuild only if the shape (which temas/modos exist)
      // changed while away; otherwise just refresh the numbers.
      this._rebuildIfNeeded();
    }
  
    // Which temas exist, their modo and name — everything the SHELL bakes in.
    _shapeKey() {
      return this._roster.getTemas().map((t) => `${t.id}:${t.modo}:${t.nombre}`).join('|');
    }
  
    _rebuildIfNeeded() {
      if (this._shapeKey() !== this._builtShapeKey) this._rebuild();
      else this._render();
    }
  
    beforeDestroy() {
      slice.controller.destroyByContainer(this.$root);
      if (this._teamModal) slice.controller.destroyComponent(this._teamModal);
      this._charts?.destroy(this._completionChart);
    }
  
    async _rebuild() {
      // Tear down the old shell's built children (StatusBadges) before rebuilding.
      slice.controller.destroyByContainer(this.$root);
      this._charts?.destroy(this._completionChart);
      this._completionChart = null;
      await this._buildShell();
      this._render();
    }
  
    async _buildShell() {
      const roster = this._roster;
      const esc = (s) => this._html.esc(s);
      const temas = roster.getTemas();
      const temasReparto = roster.getTemasParticipables();
      const temasVotacion = roster.getTemasVotacion();
      const temasRanking = roster.getTemasRanking();
      const temasTexto = roster.getTemasTexto();
  
      // A per-tema answered/pending list — shared by votación / ranking / texto.
      const modoSection = (title, sub, temas, prefix) => `
        <h3 class="view-title dash-section-title">${title}</h3>
        <p class="view-sub">${sub}</p>
        <div class="texto-list">
          ${temas.map((c) => `
            <div class="texto-row">
              <span class="texto-row__name">${esc(c.nombre)}</span>
              <span class="badge" data-el="${prefix}-badge-${c.id}"></span>
            </div>`).join('')}
        </div>`;
  
      if (!temas.length) {
        this.$root.innerHTML = this._html.sanitize('<div class="dash-header"><h2 class="view-title">Dashboard</h2></div>');
        const empty = await slice.build('EmptyState', {
          icon: '\uD83D\uDCCB',
          title: 'Todav\u00EDa no hay una Plantilla',
          description: 'Cre\u00E1 una plantilla con Temas y Opciones para empezar a asignar equipos, votar y m\u00E1s.',
          buttonLabel: '\uD83D\uDCD0 Ir a Plantilla',
          buttonRoute: '/plantilla',
        });
        if (empty instanceof Node) this.$root.appendChild(empty);
        this._els = { plantillaName: null, plantillaMeta: null, sub: null, totalTemas: null, answered: null, enRango: null, conProblema: null, cardRango: null, cardProblema: null, completionPct: null, shareBtnSlot: null };
        this._teamEls = {};
        this._votoEls = {};
        this._rankEls = {};
        this._textoEls = {};
        this._badges = {};
        return;
      }
  
      let html = `
        <div class="dash-header">
          <h2 class="view-title">Dashboard</h2>
        </div>
        <div class="dash-info-row">
          <div data-el="shareBtnSlot"></div>
          <span class="dash-plantilla__name" data-el="plantillaName"></span>
          <span class="dash-plantilla__meta" data-el="plantillaMeta"></span>
        </div>
        <p class="view-sub" data-el="sub"></p>
        <div class="stat-grid">
          <div class="stat-card stat-card--chart">
            <div class="k">Progreso</div>
            <div class="dash-chart-wrap">
              <canvas data-el="completionCanvas"></canvas>
              <div class="dash-chart-pct" data-el="completionPct"></div>
            </div>
          </div>
          <div class="stat-card"><div class="k">Temas</div><div class="v" data-el="totalTemas"></div></div>
          <div class="stat-card"><div class="k">Respondido</div><div class="v" data-el="answered"></div></div>
          <div class="stat-card" data-el="cardRango" hidden><div class="k">En rango</div><div class="v" data-el="enRango"></div></div>
          <div class="stat-card" data-el="cardProblema" hidden><div class="k">Fuera de rango</div><div class="v" data-el="conProblema"></div></div>
        </div>`;
  
      if (temasReparto.length) {
        html += `
          <h3 class="view-title dash-section-title">🎯 Asignación</h3>
          <p class="view-sub">Cada barra muestra las opciones asignadas frente al mínimo y máximo. Toca un tema para ver quiénes quedaron.</p>
          <div class="tema-grid">
            ${temasReparto.map((t) => {
              const col = roster.colorFor(t.id);
              return `
              <div class="tema-card" data-tema-id="${t.id}" style="--tema-color:${col}">
                <div class="tema-head">
                  <h3><span class="color-dot" style="background:${col}"></span>${esc(t.nombre)}</h3>
                  <div class="tema-count" style="color:${col}"><span data-el="n-${t.id}"></span><small>/${t.max != null ? t.max : '–'}</small></div>
                </div>
                <div class="tema-meta">Mín ${t.min != null ? t.min : '–'} · Máx ${t.max != null ? t.max : '–'}</div>
                <div class="tema-lider" data-el="lider-${t.id}"></div>
                <div class="bar"><span data-el="bar-${t.id}" style="background:${col}"></span></div>
                <div class="badge-slot" data-badge="${t.id}"></div>
              </div>`;
            }).join('')}
          </div>`;
      }
  
      if (temasVotacion.length) html += modoSection('🗳️ Votación', 'Respondido = elegiste una opción en el tema.', temasVotacion, 'voto');
      if (temasRanking.length) html += modoSection('🏆 Ranking', 'Respondido = ordenaste las opciones del tema.', temasRanking, 'rank');
      if (temasTexto.length) html += modoSection('📝 Texto libre', 'Respondido = escribiste tu propuesta.', temasTexto, 'texto');
  
      this.$root.innerHTML = this._html.sanitize(html);
  
      this._els = {
        plantillaName: this.$root.querySelector('[data-el="plantillaName"]'),
        plantillaMeta: this.$root.querySelector('[data-el="plantillaMeta"]'),
        sub: this.$root.querySelector('[data-el="sub"]'),
        totalTemas: this.$root.querySelector('[data-el="totalTemas"]'),
        answered: this.$root.querySelector('[data-el="answered"]'),
        enRango: this.$root.querySelector('[data-el="enRango"]'),
        conProblema: this.$root.querySelector('[data-el="conProblema"]'),
        cardRango: this.$root.querySelector('[data-el="cardRango"]'),
        cardProblema: this.$root.querySelector('[data-el="cardProblema"]'),
        completionPct: this.$root.querySelector('[data-el="completionPct"]'),
      };
      this._els.shareBtnSlot = this.$root.querySelector('[data-el="shareBtnSlot"]');
      if (this._els.shareBtnSlot) {
        const shareBtn = await slice.build('Button', {
          sliceId: 'dash-share-btn',
          value: '📤 Compartir respuestas',
          variant: 'filled',
          onClick: () => slice.getComponent('ExportRespuestasModal').show(),
        });
        if (shareBtn instanceof Node) this._els.shareBtnSlot.appendChild(shareBtn);
      }
  
      if (this._charts.isAvailable()) {
        const canvas = this.$root.querySelector('[data-el="completionCanvas"]');
        this._completionChart = this._charts.create(canvas, {
          type: 'doughnut',
          data: {
            labels: ['Respondido', 'Pendiente'],
            datasets: [{
              data: [0, 0],
              backgroundColor: [this._charts.themeColor('--success-color'), this._charts.themeColor('--secondary-background-color')],
              borderColor: this._charts.themeColor('--font-primary-color'),
              borderWidth: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            animation: { duration: 300 },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
          },
        });
      }
  
      this._teamEls = {};
      temasReparto.forEach((t) => {
        this._teamEls[t.id] = {
          n: this.$root.querySelector(`[data-el="n-${t.id}"]`),
          bar: this.$root.querySelector(`[data-el="bar-${t.id}"]`),
          lider: this.$root.querySelector(`[data-el="lider-${t.id}"]`),
        };
      });
  
      this._votoEls = {};
      temasVotacion.forEach((c) => { this._votoEls[c.id] = this.$root.querySelector(`[data-el="voto-badge-${c.id}"]`); });
      this._rankEls = {};
      temasRanking.forEach((c) => { this._rankEls[c.id] = this.$root.querySelector(`[data-el="rank-badge-${c.id}"]`); });
      this._textoEls = {};
      temasTexto.forEach((c) => { this._textoEls[c.id] = this.$root.querySelector(`[data-el="texto-badge-${c.id}"]`); });
  
      // StatusBadges only for reparto temas (guard the first/rest pattern).
      this._badges = {};
      if (temasReparto.length) {
        const badgeProps = temasReparto.map((t) => ({ sliceId: `dash-badge-${t.id}`, status: 'empty', label: '' }));
        const [first, ...rest] = badgeProps;
        const firstBadge = await slice.build('StatusBadge', first);
        const restBadges = await Promise.all(rest.map((p) => slice.build('StatusBadge', p)));
        const badgeNodes = [firstBadge, ...restBadges];
        temasReparto.forEach((t, i) => {
          this._badges[t.id] = badgeNodes[i];
          this.$root.querySelector(`[data-badge="${t.id}"]`).appendChild(badgeNodes[i]);
        });
  
        this.$root.querySelector('.tema-grid').addEventListener('click', (e) => {
          const card = e.target.closest('.tema-card');
          if (card) this._openTemaModal(card.dataset.temaId);
        });
      }
  
      this._builtShapeKey = this._shapeKey();
    }
  
    _render() {
      // Empty state — nothing to render
      if (!this._els?.sub) return;
  
      const roster = this._roster;
      const temasReparto = roster.getTemasParticipables();
      const asignaciones = slice.getComponent('RespuestasService').getState().seleccion;
      const counts = roster.countByTema(asignaciones);
      const autor = slice.getComponent('SettingsService').getState().autor;
      const progress = roster.getAnswerProgress();
  
      this._els.sub.textContent = `Resumen de tus respuestas${autor ? ' — ' + autor : ''}.`;
  
      const nombrePlantilla = roster.getNombre();
      const nReparto = roster.getTemas().filter((c) => c.modo === 'reparto').length;
      const nVotacion = roster.getTemasVotacion().length;
      const nRanking = roster.getTemasRanking().length;
      const nTexto = roster.getTemasTexto().length;
      const composicion = [
        nReparto ? `🎯 ${nReparto} de asignación` : null,
        nVotacion ? `🗳️ ${nVotacion} de votación` : null,
        nRanking ? `🏆 ${nRanking} de ranking` : null,
        nTexto ? `📝 ${nTexto} de texto libre` : null,
      ].filter(Boolean).join(' · ');
      const maxName = (nombrePlantilla || 'Plantilla sin nombre').slice(0, 40);
      this._els.plantillaName.textContent = `📋 ${maxName}${(nombrePlantilla || '').length > 40 ? '…' : ''}`;
      this._els.plantillaName.title = nombrePlantilla || '';
      this._els.plantillaMeta.textContent = composicion;
      this._els.plantillaMeta.hidden = !composicion;
  
      this._els.totalTemas.textContent = roster.getTemas().length;
      this._els.answered.innerHTML = `${progress.answered} <small>/ ${progress.total}</small>`;
  
      // Reparto-only cards: shown + filled only when there ARE reparto temas.
      const showReparto = temasReparto.length > 0;
      this._els.cardRango.hidden = !showReparto;
      this._els.cardProblema.hidden = !showReparto;
      if (showReparto) {
        const enRango = temasReparto.filter((t) => roster.statusOf(t, counts[t.id]) === 'ok').length;
        const conProblema = temasReparto.filter((t) => ['under', 'over'].includes(roster.statusOf(t, counts[t.id]))).length;
        this._els.enRango.innerHTML = `${enRango} <small>/ ${temasReparto.length}</small>`;
        this._els.conProblema.textContent = conProblema;
      }
  
      if (this._completionChart) {
        this._completionChart.data.datasets[0].data = [progress.answered, Math.max(progress.total - progress.answered, 0)];
        this._completionChart.update();
      }
      this._els.completionPct.textContent = `${progress.total ? Math.round((progress.answered / progress.total) * 100) : 0}%`;
  
      temasReparto.forEach((t) => {
        const n = counts[t.id];
        const st = roster.statusOf(t, n);
        const denom = t.max || Math.max(n, 1);
        const pct = Math.min(100, Math.round((n / denom) * 100));
        this._teamEls[t.id].n.textContent = n;
        this._teamEls[t.id].bar.style.width = `${pct}%`;
        if (this._badges[t.id]) slice.setComponentProps(this._badges[t.id], { status: st, label: roster.statusLabel(t, n) });
        const lider = slice.getComponent('SettingsService').getEffectiveLider(t.id);
        this._teamEls[t.id].lider.textContent = lider && lider.opcion ? `👑 ${lider.opcion.nombre}` : '';
      });
  
      const resp = slice.getComponent('RespuestasService').getState();
      const setBadge = (el, answered) => {
        el.className = `badge ${answered ? 'ok' : 'empty'}`;
        el.textContent = answered ? 'Respondido' : 'Pendiente';
      };
      Object.entries(this._votoEls).forEach(([id, el]) => setBadge(el, resp.voto?.[id] != null));
      Object.entries(this._rankEls).forEach(([id, el]) => setBadge(el, (resp.ranking?.[id] || []).length > 0));
      Object.entries(this._textoEls).forEach(([id, el]) => setBadge(el, !!(resp.texto?.[id] || '').trim()));
    }
  
    async _openTemaModal(temaId) {
      const roster = this._roster;
      const tema = roster.getTemasParticipables().find((t) => t.id === temaId);
      if (!tema) return;
  
      const asignaciones = slice.getComponent('RespuestasService').getState().seleccion;
      const opciones = roster.getOpcionesDisponibles().filter((m) => asignaciones[m.id] === temaId);
      const lider = slice.getComponent('SettingsService').getEffectiveLider(temaId);
      const liderId = lider?.opcion ? String(lider.opcion.id) : null;
  
      if (!this._teamModal) {
        this._teamModal = await slice.build('Modal', { sliceId: 'tema-opciones-modal', dismissable: true });
        this._teamModal.classList.add('tema-opciones-modal');
        this._teamOpcionList = document.createElement('div');
        this._teamOpcionList.className = 'tema-opcion-list';
        this._teamModal.appendBody(this._teamOpcionList);
        document.body.appendChild(this._teamModal);
      }
  
      this._teamModal.title = `${tema.nombre} ${lider ? '👑' : ''}`;
      this._teamOpcionList.innerHTML = this._html.sanitize(opciones.length
        ? opciones.map((m) => `
          <div class="tema-opcion-item${liderId === String(m.id) ? ' is-lider' : ''}">
            <span class="nm">${this._html.esc(m.nombre)}</span>
            ${liderId === String(m.id) ? '<span class="lider-badge">Responsable</span>' : ''}
          </div>`).join('')
        : '<div class="empty-state">Sin opciones asignadas</div>');
  
      this._teamModal.open = true;
    }
  }
  
  window.DashboardView = DashboardView;
  if (!customElements.get('slice-dashboardview')) { customElements.define('slice-dashboardview', DashboardView); }
  
  return DashboardView;
};

const SLICE_CLASS_FACTORY_SliceComponent_DomService = () => {
  // DOM/list helpers for views — keeps the leak-prone list-diff logic in ONE
  // place (services own logic; Visual is only UI) instead of hand-rolled in
  // every view.
  //
  // reconcile() is the canonical way to render a variable-length list of child
  // components, following the framework's own update() guidance:
  //   • existing (by stable sliceId) → refresh IN PLACE, prop-by-prop
  //     (slice.setComponentProps by default, or a coordinated node.update(props)
  //     via the `refresh` override for interdependent props / async child builds).
  //   • new → slice.build with the stable sliceId.
  //   • gone → slice.controller.destroyComponent (runs beforeDestroy so the
  //     registry is cleaned) — NEVER innerHTML='' (GOTCHAS §7 leak).
  //   • order → the DOM sequence is forced to match `items` order, so the items
  //     array is the single source of truth for display order (newest-first, an
  //     `orden` field, a re-sort, drag). Moving an existing node is NOT cloning,
  //     so it never re-runs the constructor / leaks (GOTCHAS §6) — only nodes
  //     that are out of place are moved.
  class DomService {
    async reconcile(container, items, { keyOf, component, props, refresh }) {
      const applyRefresh = refresh || ((node, p) => slice.setComponentProps(node, p));
      const alive = new Set();
      const ordered = [];
  
      for (const item of items) {
        const sliceId = keyOf(item);
        alive.add(sliceId);
        const p = props ? props(item) : {};
        let node = slice.getComponent(sliceId);
        if (node) {
          await applyRefresh(node, p);
        } else {
          node = await slice.build(component, { sliceId, ...p });
        }
        if (node) ordered.push(node);
      }
  
      // Prune: destroy children whose data is gone (before reordering).
      for (const el of Array.from(container.children)) {
        const id = el.getAttribute('slice-id');
        if (id && !alive.has(id)) slice.controller.destroyComponent(id);
      }
  
      // Enforce DOM order === items order — move only what's out of place.
      ordered.forEach((node, i) => {
        if (container.children[i] !== node) {
          container.insertBefore(node, container.children[i] || null);
        }
      });
    }
  }
  
  window.DomService = DomService;
  return DomService;
};

const SLICE_CLASS_FACTORY_SliceComponent_DragDropService = () => {
  const getHandleConfig = __sliceResolveBundleDependency("Components/Providers/DragDropService/dndGeometry.js").getHandleConfig;
  const computeResizeRect = __sliceResolveBundleDependency("Components/Providers/DragDropService/dndGeometry.js").computeResizeRect;
  
  
  class DragDropService {
    constructor() {
      this._draggables = new Map();
      this._droppables = new Map();
      this._resizables = new Map();
      this._sortables = new Map();
      this._activeDrag = null;
      this._activeDrop = null;
      this._activeResize = null;
      this._activeSortable = null;
      this._ghost = null;
      this._droppableRects = null;
      this._scroll = null;
  
      this._onPointerDown = this._onPointerDown.bind(this);
      this._onPointerMove = this._onPointerMove.bind(this);
      this._onPointerUp = this._onPointerUp.bind(this);
      this._onViewportChange = this._snapshotDroppables.bind(this);
      this._autoScrollTick = this._autoScrollTick.bind(this);
  
      document.addEventListener('pointerdown', this._onPointerDown);
      DragDropService._injectCSS();
    }
  
    static _cssInjected = false;
  
    static _injectCSS() {
      if (DragDropService._cssInjected) return;
      DragDropService._cssInjected = true;
      const old = document.getElementById('dnd-service-styles');
      if (old) old.remove();
      const style = document.createElement('style');
      style.id = 'dnd-service-styles';
      style.textContent = `
        .dnd-handle{position:absolute;z-index:1;touch-action:none;transition:background .15s,border-color .15s,box-shadow .15s}
        .dnd-handle:hover{background:rgba(59,130,246,.28);border-color:rgba(59,130,246,.9)}
        .dnd-handle--n,.dnd-handle--s,.dnd-handle--e,.dnd-handle--w{border-radius:1px;background:rgba(59,130,246,.14);border:1px solid rgba(59,130,246,.45)}
        .dnd-handle--n{bottom:auto;top:-5px;left:6px;right:6px;height:10px;cursor:ns-resize}
        .dnd-handle--s{top:auto;bottom:-5px;left:6px;right:6px;height:10px;cursor:ns-resize}
        .dnd-handle--e{left:auto;right:-5px;top:6px;bottom:6px;width:10px;cursor:ew-resize}
        .dnd-handle--w{right:auto;left:-5px;top:6px;bottom:6px;width:10px;cursor:ew-resize}
        .dnd-handle--ne,.dnd-handle--nw,.dnd-handle--se,.dnd-handle--sw{border-radius:4px;background:#fff;border:1.5px solid rgba(59,130,246,.75);box-shadow:0 1px 4px rgba(0,0,0,.2)}
        .dnd-handle--ne::after,.dnd-handle--nw::after,.dnd-handle--se::after,.dnd-handle--sw::after{content:'';position:absolute;inset:2px;border-radius:2px;background:repeating-linear-gradient(135deg,transparent,transparent 2px,rgba(59,130,246,.18) 2px,rgba(59,130,246,.18) 3px);pointer-events:none}
        .dnd-handle--ne{inset:auto -5px -5px auto;width:16px;height:16px;cursor:nesw-resize}
        .dnd-handle--nw{inset:-5px auto -5px -5px;width:16px;height:16px;cursor:nwse-resize}
        .dnd-handle--se{bottom:-5px;right:-5px;width:16px;height:16px;cursor:nwse-resize}
        .dnd-handle--sw{bottom:-5px;left:-5px;width:16px;height:16px;cursor:nesw-resize}
        .dnd-ghost{position:fixed;pointer-events:none;z-index:999999;opacity:.85;margin:0;will-change:transform;box-shadow:0 8px 30px rgba(0,0,0,.15)}
        .dnd-sortable-ph{pointer-events:none;flex:0 0 auto}
        .dnd-dragging{user-select:none;-webkit-user-select:none}
      `;
      document.head.appendChild(style);
    }
  
    // ─── Draggable ───────────────────────────────────────────────
  
    makeDraggable(node, config = {}) {
      const cfg = {
        handle: config.handle || null,
        data: config.data || null,
        axis: config.axis || 'both',
        ghost: config.ghost !== false,
        ghostClass: config.ghostClass || '',
        threshold: config.threshold || 0,
        freePosition: config.freePosition || false,
        autoScroll: config.autoScroll !== false,
        onDragStart: config.onDragStart || null,
        onDrag: config.onDrag || null,
        onDragEnd: config.onDragEnd || null,
      };
      this._draggables.set(node, cfg);
      return this;
    }
  
    // ─── Droppable ───────────────────────────────────────────────
  
    makeDroppable(node, config = {}) {
      const cfg = {
        accept: config.accept || null,
        onDragEnter: config.onDragEnter || null,
        onDragLeave: config.onDragLeave || null,
        onDragOver: config.onDragOver || null,
        onDrop: config.onDrop || null,
      };
      this._droppables.set(node, cfg);
      return this;
    }
  
    // ─── Resizable ───────────────────────────────────────────────
  
    makeResizable(node, config = {}) {
      const cfg = {
        handles: config.handles || ['se'],
        minWidth: config.minWidth ?? 50,
        minHeight: config.minHeight ?? 50,
        maxWidth: config.maxWidth ?? Infinity,
        maxHeight: config.maxHeight ?? Infinity,
        onResizeStart: config.onResizeStart || null,
        onResize: config.onResize || null,
        onResizeEnd: config.onResizeEnd || null,
      };
  
      const pos = window.getComputedStyle(node).position;
      if (pos === 'static') node.style.position = 'relative';
  
      const container = document.createElement('div');
      container.className = 'dnd-resize-handles';
      container.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none';
  
      for (const name of cfg.handles) {
        const hc = getHandleConfig(name);
        if (!hc) continue;
        const el = document.createElement('div');
        el.className = `dnd-handle dnd-handle--${name}`;
        el.dataset.handle = name;
        el.style.pointerEvents = 'auto';
        el.addEventListener('pointerdown', (e) => this._onHandlePointerDown(e, node, cfg, hc.edges));
        container.appendChild(el);
      }
  
      node.appendChild(container);
      this._resizables.set(node, cfg);
      return this;
    }
  
    // ─── Detach / Destroy ────────────────────────────────────────
  
    detach(node) {
      this._draggables.delete(node);
      this._droppables.delete(node);
  
      if (this._resizables.delete(node)) {
        const handles = node.querySelector('.dnd-resize-handles');
        if (handles) handles.remove();
      }
  
      const sortCfg = this._sortables.get(node);
      if (sortCfg) {
        node.removeEventListener('pointerdown', sortCfg._onDown);
        this._sortables.delete(node);
      }
  
      if (this._activeDrag?.node === node) {
        this._endDrag(null);
      }
      if (this._activeDrop?.node === node) {
        this._activeDrop = null;
      }
      if (this._activeResize?.node === node) {
        this._endResize(null);
      }
      if (this._activeSortable?.container === node) {
        this._endSortable(null);
      }
      return this;
    }
  
    // PATCHED: was named destroy() — the framework only ever calls
    // beforeDestroy(), so this cleanup (removing the document-level
    // pointerdown listener, among other things) could never actually run.
    // If DragDropService is ever re-synced from the registry
    // (`slice sync --service`), re-check this rename survived.
    beforeDestroy() {
      document.removeEventListener('pointerdown', this._onPointerDown);
      if (this._activeDrag) this._endDrag(null);
      if (this._activeSortable) this._endSortable(null);
  
      for (const node of this._resizables.keys()) {
        const handles = node.querySelector('.dnd-resize-handles');
        if (handles) handles.remove();
      }
  
      for (const [container, cfg] of this._sortables) {
        container.removeEventListener('pointerdown', cfg._onDown);
      }
  
      this._removeGhost();
      this._stopAutoScroll();
      this._draggables.clear();
      this._droppables.clear();
      this._resizables.clear();
      this._sortables.clear();
  
      document.body.classList.remove('dnd-dragging');
      this._removeDocListeners();
    }
  
    // ─── Internal: Pointer Dispatch ──────────────────────────────
  
    _onPointerDown(event) {
      if (event.button !== 0) return;
  
      for (const [node, cfg] of this._draggables) {
        if (!node.isConnected) continue;
        if (!node.contains(event.target)) continue;
        if (event.target.closest('.dnd-resize-handles')) continue;
  
        if (cfg.handle) {
          const handleEl = typeof cfg.handle === 'string'
            ? node.querySelector(cfg.handle)
            : cfg.handle;
          if (!handleEl || !handleEl.contains(event.target)) continue;
        }
  
        this._startDrag(event, node, cfg);
        return;
      }
    }
  
    _onPointerMove(event) {
      if (this._activeSortable) {
        this._onSortableMove(event);
        return;
      }
      if (this._activeResize) {
        this._onResizeMove(event);
        return;
      }
      if (this._activeDrag) {
        this._onDragMove(event);
      }
    }
  
    _onPointerUp(event) {
      if (this._activeSortable) {
        this._endSortable(event);
        return;
      }
      if (this._activeResize) {
        this._endResize(event);
        return;
      }
      if (this._activeDrag) {
        this._endDrag(event);
      }
    }
  
    _addDocListeners() {
      document.addEventListener('pointermove', this._onPointerMove);
      document.addEventListener('pointerup', this._onPointerUp);
    }
  
    _removeDocListeners() {
      document.removeEventListener('pointermove', this._onPointerMove);
      document.removeEventListener('pointerup', this._onPointerUp);
    }
  
    // ─── Internal: Drag ──────────────────────────────────────────
  
    _startDrag(event, node, cfg) {
      if (this._activeDrag) return;
  
      this._activeDrag = {
        node, cfg,
        startPos: { x: event.clientX, y: event.clientY },
        currentPos: { x: event.clientX, y: event.clientY },
        startRect: node.getBoundingClientRect(),
        active: false,
        data: cfg.data,
      };
  
      this._addDocListeners();
    }
  
    _onDragMove(event) {
      const d = this._activeDrag;
      d.currentPos = { x: event.clientX, y: event.clientY };
      const dx = d.currentPos.x - d.startPos.x;
      const dy = d.currentPos.y - d.startPos.y;
  
      if (!d.active) {
        if (Math.sqrt(dx * dx + dy * dy) < d.cfg.threshold) return;
        d.active = true;
        document.body.classList.add('dnd-dragging');
        if (d.cfg.ghost) this._createGhost(d.node, d.cfg);
        d.cfg.onDragStart?.(d.node, event, d.data);
        // Snapshot droppable rects once per drag instead of measuring every move
        // (a getBoundingClientRect per droppable per pointermove forces layout).
        // Scroll/resize during the drag re-snapshots so hit-testing stays correct.
        this._snapshotDroppables();
        window.addEventListener('scroll', this._onViewportChange, true);
        window.addEventListener('resize', this._onViewportChange);
      }
  
      let moveX = dx;
      let moveY = dy;
      if (d.cfg.axis === 'x') moveY = 0;
      if (d.cfg.axis === 'y') moveX = 0;
  
      if (this._ghost) {
        this._ghost.style.transform = `translate(${moveX}px, ${moveY}px)`;
      } else if (d.cfg.freePosition) {
        // No ghost + freePosition → move the real element live so the container
        // follows the pointer directly. The offset is committed to left/top in
        // _endDrag, where the transform is cleared.
        d.node.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
  
      d.cfg.onDrag?.(d.node, event, d.data, { dx: moveX, dy: moveY });
      this._updateDroppableHover(event);
      if (d.cfg.autoScroll && this._dragCanScroll(d)) this._updateAutoScroll(event, d.node);
    }
  
    // Auto-scroll a draggable only when the drag has somewhere to go: it
    // repositions the element (freePosition) or there are drop targets it could
    // reach. A plain ghost-only drag with no droppables has nowhere to land, so
    // scrolling the page would just be surprising. (Sortable always qualifies.)
    _dragCanScroll(d) {
      return d.cfg.freePosition || this._droppables.size > 0;
    }
  
    _endDrag(event) {
      const d = this._activeDrag;
      if (!d) return;
  
      document.body.classList.remove('dnd-dragging');
      this._removeDocListeners();
      window.removeEventListener('scroll', this._onViewportChange, true);
      window.removeEventListener('resize', this._onViewportChange);
      this._droppableRects = null;
      this._stopAutoScroll();
      this._removeGhost();
  
      if (d.active) {
        if (d.cfg.freePosition) {
          let dx = d.currentPos.x - d.startPos.x;
          let dy = d.currentPos.y - d.startPos.y;
          if (d.cfg.axis === 'x') dy = 0;
          if (d.cfg.axis === 'y') dx = 0;
          // Clear any live-move transform; the offset is committed to left/top.
          d.node.style.transform = '';
          if (dx !== 0 || dy !== 0) {
            // Free positioning works in viewport coordinates, so the element must
            // be `fixed`. For `relative`/`absolute` the left/top we compute below
            // are viewport pixels, which a non-fixed element would interpret as an
            // offset from its flow/containing-block position (the box jumps away).
            const cs = window.getComputedStyle(d.node);
            if (cs.position !== 'fixed') d.node.style.position = 'fixed';
            d.node.style.left = (d.startRect.left + dx) + 'px';
            d.node.style.top = (d.startRect.top + dy) + 'px';
            d.node.style.width = d.startRect.width + 'px';
            d.node.style.height = d.startRect.height + 'px';
          }
        }
  
        d.cfg.onDragEnd?.(d.node, event, d.data);
  
        if (this._activeDrop) {
          this._activeDrop.cfg.onDrop?.(this._activeDrop.node, event, d.data);
          this._activeDrop = null;
        }
      }
  
      this._activeDrag = null;
    }
  
    _snapshotDroppables() {
      this._droppableRects = [];
      for (const [node, cfg] of this._droppables) {
        if (!node.isConnected) continue;
        this._droppableRects.push({ node, cfg, rect: node.getBoundingClientRect() });
      }
    }
  
    _updateDroppableHover(event) {
      const x = event.clientX;
      const y = event.clientY;
      let hit = null;
  
      for (const { node, cfg, rect } of this._droppableRects || []) {
        if (!node.isConnected) continue;
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          if (!cfg.accept || cfg.accept(this._activeDrag?.data)) {
            hit = { node, cfg };
            break;
          }
        }
      }
  
      if (this._activeDrop && this._activeDrop !== hit) {
        this._activeDrop.cfg.onDragLeave?.(this._activeDrop.node, event, this._activeDrag?.data);
      }
  
      if (hit && this._activeDrop !== hit) {
        hit.cfg.onDragEnter?.(hit.node, event, this._activeDrag?.data);
      }
  
      this._activeDrop = hit;
      hit?.cfg.onDragOver?.(hit.node, event, this._activeDrag?.data);
    }
  
    // ─── Internal: Ghost ─────────────────────────────────────────
  
    _createGhost(node, cfg) {
      this._removeGhost();
      const ghost = node.cloneNode(true);
      ghost.className = `dnd-ghost${cfg.ghostClass ? ' ' + cfg.ghostClass : ''}`;
      // Drop any resize-handle container copied from the source so the ghost has
      // no grips on it.
      ghost.querySelectorAll('.dnd-resize-handles').forEach((el) => el.remove());
      const rect = node.getBoundingClientRect();
      // Force fixed positioning INLINE. The source may carry an inline
      // position:relative/absolute that would win over the .dnd-ghost class rule
      // and drop the clone far down the page (top/left become flow offsets).
      ghost.style.position = 'fixed';
      ghost.style.margin = '0';
      ghost.style.transform = 'none';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.top = rect.top + 'px';
      ghost.style.left = rect.left + 'px';
      document.body.appendChild(ghost);
      this._ghost = ghost;
    }
  
    _removeGhost() {
      if (this._ghost && this._ghost.parentNode) {
        this._ghost.parentNode.removeChild(this._ghost);
      }
      this._ghost = null;
    }
  
    // ─── Internal: Auto-scroll ───────────────────────────────────
    // When the pointer nears an edge of the scroll container (or the viewport),
    // scroll it continuously so the user can drag past the visible region — the
    // missing piece for long pages and long lists. Velocity scales with how deep
    // the pointer is into the edge zone; a rAF loop keeps scrolling even when the
    // pointer is held still (no pointermove fires). Opt out with autoScroll:false.
  
    static _EDGE = 48;        // px from the edge where auto-scroll kicks in
    static _MAX_SPEED = 20;   // px per frame at the very edge
  
    // Nearest scrollable ancestor (including the node itself), else the viewport.
    _getScrollParent(node) {
      let el = node;
      while (el && el !== document.body && el !== document.documentElement) {
        const s = window.getComputedStyle(el);
        const canY = (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        const canX = (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth > el.clientWidth;
        if (canY || canX) return el;
        el = el.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    }
  
    _isViewportTarget(target) {
      return target === document.scrollingElement || target === document.documentElement;
    }
  
    _edgeVelocity(target, x, y) {
      const EDGE = DragDropService._EDGE;
      const MAX = DragDropService._MAX_SPEED;
      const clamp01 = (v) => Math.max(0, Math.min(1, v));
      const rect = this._isViewportTarget(target)
        ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
        : target.getBoundingClientRect();
  
      let vx = 0, vy = 0;
      const top = y - rect.top, bottom = rect.bottom - y;
      if (top < EDGE) vy = -MAX * clamp01((EDGE - top) / EDGE);
      else if (bottom < EDGE) vy = MAX * clamp01((EDGE - bottom) / EDGE);
  
      const left = x - rect.left, right = rect.right - x;
      if (left < EDGE) vx = -MAX * clamp01((EDGE - left) / EDGE);
      else if (right < EDGE) vx = MAX * clamp01((EDGE - right) / EDGE);
  
      return { vx: Math.round(vx), vy: Math.round(vy) };
    }
  
    _updateAutoScroll(event, node) {
      if (!this._scroll) {
        this._scroll = { target: this._getScrollParent(node), vx: 0, vy: 0, rafId: null };
      }
      const sc = this._scroll;
      const { vx, vy } = this._edgeVelocity(sc.target, event.clientX, event.clientY);
      sc.vx = vx;
      sc.vy = vy;
      if ((vx || vy) && sc.rafId == null) {
        sc.rafId = requestAnimationFrame(this._autoScrollTick);
      }
    }
  
    _autoScrollTick() {
      const sc = this._scroll;
      if (!sc) return;
      if (!sc.vx && !sc.vy) { sc.rafId = null; return; }   // idle until the next move re-arms it
      if (this._isViewportTarget(sc.target)) {
        window.scrollBy(sc.vx, sc.vy);
      } else {
        sc.target.scrollLeft += sc.vx;
        sc.target.scrollTop += sc.vy;
      }
      sc.rafId = requestAnimationFrame(this._autoScrollTick);
    }
  
    _stopAutoScroll() {
      if (this._scroll?.rafId != null) cancelAnimationFrame(this._scroll.rafId);
      this._scroll = null;
    }
  
    // ─── Sortable ────────────────────────────────────────────────
  
    makeSortable(container, config = {}) {
      const cfg = {
        items: config.items || ':scope > *',
        axis: config.axis || 'y',
        ghostClass: config.ghostClass || '',
        autoScroll: config.autoScroll !== false,
        onReorder: config.onReorder || null,
        accept: config.accept || null,
      };
  
      // One delegated listener on the CONTAINER instead of one per item. The item
      // is resolved at pointerdown time, so items added/removed after makeSortable
      // are handled automatically, and a list of N items costs 1 listener, not N.
      cfg._onDown = (event) => {
        const item = this._resolveSortableItem(container, event.target, cfg.items);
        if (item) this._onSortablePointerDown(event, item, container, cfg);
      };
      container.addEventListener('pointerdown', cfg._onDown);
  
      this._sortables.set(container, cfg);
      return this;
    }
  
    // ─── Internal: Sortable ──────────────────────────────────────
  
    // Walks up from the event target to the direct child of `container` that
    // also matches the items selector. `:scope > *` (the default) matches any
    // direct child; a `:scope > ` prefix is stripped so `.matches()` accepts it.
    _resolveSortableItem(container, target, selector) {
      const sel = selector === ':scope > *' ? null : selector.replace(/^:scope\s*>\s*/, '');
      let node = target;
      while (node && node.parentNode !== container) {
        node = node.parentNode;
      }
      if (!node || node.parentNode !== container) return null;
      if (sel && !node.matches(sel)) return null;
      return node;
    }
  
    _onSortablePointerDown(event, item, container, cfg) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
  
      const fromIndex = [...container.children].indexOf(item);
      const rect = item.getBoundingClientRect();
  
      const placeholder = document.createElement('div');
      placeholder.className = 'dnd-sortable-ph' + (cfg.ghostClass ? ' ' + cfg.ghostClass : '');
      placeholder.style.cssText = `height:${rect.height}px;margin:0;background:rgba(59,130,246,.08);border:2px dashed #3b82f6;border-radius:6px;box-sizing:border-box`;
      container.insertBefore(placeholder, item);
  
      const ghost = document.createElement('div');
      const ghostStyle = {
        position: 'fixed', pointerEvents: 'none', zIndex: '999999',
        opacity: '.85', width: rect.width + 'px', height: rect.height + 'px',
        top: rect.top + 'px', left: rect.left + 'px',
        background: '#fff', border: '1px solid #d1d5db',
        borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif', fontSize: '14px',
        willChange: 'transform',
      };
      Object.assign(ghost.style, ghostStyle);
      ghost.textContent = item.textContent || '';
      document.body.appendChild(ghost);
  
      // Hide the original with inline !important so it beats a component's own
      // CSS (e.g. slice-card sets `display:flex !important`); plain inline
      // display:none would lose to that and the item would look cloned.
      item.style.setProperty('display', 'none', 'important');
  
      this._activeSortable = {
        container, cfg, item, placeholder, ghost,
        fromIndex,
        startPos: { x: event.clientX, y: event.clientY },
        lastInsertIndex: fromIndex,
        items: [],
        mids: [],
      };
  
      // Measure the sibling midpoints once up front. We only re-measure when the
      // placeholder actually crosses into a new slot (see _onSortableMove), so a
      // typical move costs O(1) cache reads instead of a getBoundingClientRect per
      // item per pointermove — what makes long lists (hundreds+) feel sluggish.
      this._measureSortable(this._activeSortable);
  
      this._addDocListeners();
    }
  
    // Snapshots the current sibling items (excluding the dragged item and the
    // placeholder) and their midpoints along the sort axis. The item SET is stable
    // during a drag; only positions shift as the placeholder moves, so this is
    // recomputed exactly when the placeholder is reinserted.
    _measureSortable(s) {
      s.items = [...s.container.children].filter(c =>
        c !== s.item && c !== s.placeholder && c.style.display !== 'none'
      );
      s.mids = s.items.map(el => {
        const r = el.getBoundingClientRect();
        return s.cfg.axis === 'x' ? r.left + r.width / 2 : r.top + r.height / 2;
      });
    }
  
    _onSortableMove(event) {
      const s = this._activeSortable;
      const dx = event.clientX - s.startPos.x;
      const dy = event.clientY - s.startPos.y;
  
      s.ghost.style.transform = `translate(${dx}px, ${dy}px)`;
  
      const pos = s.cfg.axis === 'x' ? event.clientX : event.clientY;
  
      let insertIndex = s.mids.length;
      for (let i = 0; i < s.mids.length; i++) {
        if (pos < s.mids[i]) { insertIndex = i; break; }
      }
  
      if (insertIndex !== s.lastInsertIndex) {
        const beforeNode = s.items[insertIndex] || null;
        s.container.insertBefore(s.placeholder, beforeNode);
        s.lastInsertIndex = insertIndex;
        this._measureSortable(s);   // positions shifted — refresh the cached midpoints
      }
  
      if (s.cfg.autoScroll) this._updateAutoScroll(event, s.container);
    }
  
    _endSortable(event) {
      const s = this._activeSortable;
      if (!s) return;
  
      this._removeDocListeners();
      this._stopAutoScroll();
  
      if (s.ghost && s.ghost.parentNode) s.ghost.parentNode.removeChild(s.ghost);
  
      // Move the real item into the placeholder's slot, then drop the placeholder.
      // During the drag only the placeholder moves; the item stays hidden at its
      // original index. Without this reinsertion the list never actually reorders
      // and onReorder never fires (toIndex would always equal fromIndex).
      if (s.placeholder && s.placeholder.parentNode) {
        s.container.insertBefore(s.item, s.placeholder);
        s.placeholder.parentNode.removeChild(s.placeholder);
      }
  
      s.item.style.removeProperty('display');
  
      const allChildren = [...s.container.children];
      const currentIdx = allChildren.indexOf(s.item);
  
      if (currentIdx !== s.fromIndex) {
        s.cfg.onReorder?.({
          fromIndex: s.fromIndex,
          toIndex: currentIdx,
          item: s.item,
          container: s.container,
        });
      }
  
      this._activeSortable = null;
    }
  
    // ─── Internal: Resize ────────────────────────────────────────
  
    _onHandlePointerDown(event, node, cfg, edges) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      this._startResize(event, node, cfg, edges);
    }
  
    _startResize(event, node, cfg, edges) {
      if (this._activeResize) return;
      event.preventDefault();
  
      const rect = node.getBoundingClientRect();
  
      this._activeResize = {
        node, cfg, edges,
        startPos: { x: event.clientX, y: event.clientY },
        startRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      };
  
      cfg.onResizeStart?.(node, event, { ...rect });
      this._addDocListeners();
    }
  
    _onResizeMove(event) {
      const r = this._activeResize;
      const delta = {
        x: event.clientX - r.startPos.x,
        y: event.clientY - r.startPos.y,
      };
  
      const newRect = computeResizeRect(
        r.startRect, delta, r.edges,
        r.cfg.minWidth, r.cfg.minHeight,
        r.cfg.maxWidth, r.cfg.maxHeight
      );
  
      r.node.style.width = newRect.width + 'px';
      r.node.style.height = newRect.height + 'px';
      if (r.edges.includes('w')) r.node.style.left = newRect.left + 'px';
      if (r.edges.includes('n')) r.node.style.top = newRect.top + 'px';
  
      r.cfg.onResize?.(r.node, event, newRect);
    }
  
    _endResize(event) {
      const r = this._activeResize;
      if (!r) return;
  
      this._removeDocListeners();
      document.body.classList.remove('dnd-dragging');
  
      const rect = r.node.getBoundingClientRect();
      r.cfg.onResizeEnd?.(r.node, event, {
        top: rect.top, left: rect.left,
        width: rect.width, height: rect.height,
      });
  
      this._activeResize = null;
    }
  }
  
  if (typeof window !== 'undefined') {
    window.DragDropService = DragDropService;
  }
  
  window.DragDropService = DragDropService;
  return DragDropService;
};

const SLICE_CLASS_FACTORY_SliceComponent_DropDown = () => {
  class DropDown extends HTMLElement {
  
     static props = {
        label: { 
           type: 'string', 
           default: '', 
           required: false 
        },
        options: { 
           type: 'array', 
           default: [], 
           required: false 
        }
     };
  
     constructor(props) {
        super();
        slice.attachTemplate(this);
  
        this.$dropdown = this.querySelector('.slice_dropdown');
        this.$box = this.querySelector('.slice_dropbox');
        this.$label = this.querySelector('.slice_dropdown_label');
        this.$caret = this.querySelector('.caret');
  
        this.$dropdown.setAttribute('role', 'button');
        this.$dropdown.setAttribute('tabindex', '0');
        this.$dropdown.setAttribute('aria-haspopup', 'true');
        this.$dropdown.setAttribute('aria-expanded', 'false');
  
        this.$dropdown.addEventListener('click', (event) => {
           event.stopPropagation();
           this.toggleDrop();
        });
        this.$dropdown.addEventListener('keydown', (event) => {
           if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              this.toggleDrop();
           } else if (event.key === 'Escape') {
              this.closeDrop();
           }
        });
  
        // Closing is handled by re-toggling the trigger, picking an option, or the
        // outside-click listener wired in init(). A `mouseleave` auto-close was
        // removed: it fired a synthetic close on touch taps and also closed the box
        // the instant the pointer crossed the gap from the trigger to the options.
  
        slice.controller.setComponentProps(this, props);
     }
  
     init() {
        this._outsideClickListener = (event) => {
           if (!this.contains(event.target)) {
              this.closeDrop();
           }
        };
  
        document.addEventListener('click', this._outsideClickListener);
     }
  
     beforeDestroy() {
        if (this._outsideClickListener) {
           document.removeEventListener('click', this._outsideClickListener);
        }
     }
  
     get label() {
        return this._label;
     }
  
     set label(value) {
        this._label = value;
        this.$label.textContent = value;
     }
  
     get options() {
        return this._options;
     }
  
     set options(values) {
        this._options = Array.isArray(values) ? values : [];
        this.$box.innerHTML = '';
  
        this._options.forEach((element) => {
           const div = document.createElement('div');
           const e = document.createElement('a');
  
           const text = element?.text || element?.label || '';
           const href = element?.href || element?.path || '#';
  
           e.addEventListener('click', async (event) => {
              if (element.callback) {
                 event.preventDefault();
                 element.callback();
                 this.closeDrop();
                 return;
              }
              if (element?.path && slice?.router?.navigate) {
                 event.preventDefault();
                 await slice.router.navigate(element.path);
              }
              this.closeDrop();
           });
           e.textContent = text;
           e.href = href;
           div.appendChild(e);
           this.$box.appendChild(div);
        });
     }
  
     toggleDrop() {
        const open = this.$box.classList.toggle('slice_dropbox_open');
        this.$caret.classList.toggle('caret_open');
        this.$dropdown.setAttribute('aria-expanded', open ? 'true' : 'false');
     }
     closeDrop() {
        this.$box.classList.remove('slice_dropbox_open');
        this.$caret.classList.remove('caret_open');
        this.$dropdown.setAttribute('aria-expanded', 'false');
     }
  }
  
  window.DropDown = DropDown;
  if (!customElements.get('slice-dropdown')) { customElements.define('slice-dropdown', DropDown); }
  
  return DropDown;
};

const SLICE_CLASS_FACTORY_SliceComponent_EmptyState = () => {
  class EmptyState extends HTMLElement {
    static props = {
      icon: { type: 'string', default: '📋' },
      title: { type: 'string', default: '' },
      description: { type: 'string', default: '' },
      buttonLabel: { type: 'string', default: '' },
      buttonRoute: { type: 'string', default: '' },
      buttonOnClick: { type: 'function', default: null },
    };
  
    constructor(props) {
      super();
      slice.attachTemplate(this);
      this.$icon = this.querySelector('[data-el="icon"]');
      this.$title = this.querySelector('[data-el="title"]');
      this.$description = this.querySelector('[data-el="description"]');
      this.$btnSlot = this.querySelector('[data-el="btnSlot"]');
      this._icon = '📋';
      this._title = '';
      this._description = '';
      this._buttonLabel = '';
      this._buttonRoute = '';
      this._buttonOnClick = null;
  
      slice.controller.setComponentProps(this, props);
    }
  
    get icon() { return this._icon; }
    set icon(v) { this._icon = v; this.$icon.textContent = v; }
  
    get title() { return this._title; }
    set title(v) { this._title = v; this.$title.textContent = v; }
  
    get description() { return this._description; }
    set description(v) { this._description = v; this.$description.textContent = v; }
  
    get buttonLabel() { return this._buttonLabel; }
    set buttonLabel(v) { this._buttonLabel = v; this._updateButton(); }
  
    get buttonRoute() { return this._buttonRoute; }
    set buttonRoute(v) { this._buttonRoute = v; this._updateButton(); }
  
    get buttonOnClick() { return this._buttonOnClick; }
    set buttonOnClick(v) { this._buttonOnClick = v; this._updateButton(); }
  
    async init() {
      this.$icon.textContent = this._icon;
      this.$title.textContent = this._title;
      this.$description.textContent = this._description;
      this._updateButton();
    }
  
    async _updateButton() {
      // Destroy previous button
      if (this._btn) {
        slice.controller.destroyComponent(this._btn);
        this._btn = null;
      }
      if (!this._buttonLabel) return;
  
      const onClick = this._buttonOnClick || (this._buttonRoute ? () => slice.router.navigate(this._buttonRoute) : null);
      if (!onClick) return;
  
      this._btn = await slice.build('Button', {
        value: this._buttonLabel,
        variant: 'filled',
        onClick,
      });
      if (this._btn instanceof Node) this.$btnSlot.appendChild(this._btn);
    }
  }
  
  window.EmptyState = EmptyState;
  if (!customElements.get('slice-emptystate')) { customElements.define('slice-emptystate', EmptyState); }
  
  return EmptyState;
};

const SLICE_CLASS_FACTORY_SliceComponent_EnhancedEditor = () => {
  // Markdown textarea — lightweight editor with a toolbar that inserts
  // Markdown syntax. Stores Markdown text directly. API matches the
  // old Quill-based EnhancedEditor.
  // Usage: slice.build('EnhancedEditor', { value, placeholder, oninput, onblur })
  class EnhancedEditor extends HTMLElement {
    constructor(props) {
      super();
      slice.attachTemplate(this);
      this.$toolbar = this.querySelector('[data-md-toolbar]');
      this.$textarea = this.querySelector('[data-md-textarea]');
  
      slice.controller.setComponentProps(this, props);
    }
  
    init() {
      this.$textarea.placeholder = this.placeholder || 'Escribe…';
      if (this.value) this.$textarea.value = this.value;
  
      this.$textarea.addEventListener('input', () => {
        if (this._oninput) this._oninput(this.value);
      });
      this.$textarea.addEventListener('blur', () => {
        if (this._onblur) this._onblur(this.value);
      });
  
      this.$toolbar.querySelector('[data-md-cmd="bold"]').addEventListener('click', () => this._wrap('**'));
      this.$toolbar.querySelector('[data-md-cmd="italic"]').addEventListener('click', () => this._wrap('*'));
      this.$toolbar.querySelector('[data-md-cmd="list"]').addEventListener('click', () => this._insertLine('- '));
      this.$toolbar.querySelector('[data-md-cmd="olist"]').addEventListener('click', () => this._insertLine('1. '));
    }
  
    _wrap(delim) {
      const ta = this.$textarea;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = ta.value;
      const selected = text.slice(start, end);
      const wrapped = delim + selected + delim;
      ta.value = text.slice(0, start) + wrapped + text.slice(end);
      ta.selectionStart = start + delim.length;
      ta.selectionEnd = start + delim.length + selected.length;
      ta.focus();
      ta.dispatchEvent(new Event('input'));
    }
  
    _insertLine(prefix) {
      const ta = this.$textarea;
      const start = ta.selectionStart;
      const text = ta.value;
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      ta.value = text.slice(0, lineStart) + prefix + text.slice(lineStart);
      const cursor = start + prefix.length;
      ta.selectionStart = cursor;
      ta.selectionEnd = cursor;
      ta.focus();
      ta.dispatchEvent(new Event('input'));
    }
  
    get value() { return this.$textarea ? this.$textarea.value : this._stashedValue || ''; }
    set value(v) { this._stashedValue = v; if (this.$textarea) this.$textarea.value = v || ''; }
  
    get placeholder() { return this._placeholder; }
    set placeholder(v) { this._placeholder = v; if (this.$textarea) this.$textarea.placeholder = v; }
  
    set oninput(fn) { this._oninput = fn; }
    set onblur(fn) { this._onblur = fn; }
  
    focus() { if (this.$textarea) this.$textarea.focus(); }
    setSelectionRange(a, b) { if (this.$textarea) this.$textarea.setSelectionRange(a, b); }
  }
  
  window.EnhancedEditor = EnhancedEditor;
  if (!customElements.get('slice-enhancededitor')) { customElements.define('slice-enhancededitor', EnhancedEditor); }
  
  return EnhancedEditor;
};

const SLICE_CLASS_FACTORY_SliceComponent_ExportRespuestasModal = () => {
  // Modal with three export/sharing options for respuestas: download JSON,
  // copy share link, send via email. Built lazily on first show(), owns
  // one Modal instance appended to <body> (same pattern as ConfirmActionModal).
  class ExportRespuestasModal {
    async init() {
      this._modalPromise = null;
    }
  
    async _ensureModal() {
      if (!this._modalPromise) this._modalPromise = this._buildModal();
      await this._modalPromise;
    }
  
    async _buildModal() {
      this.$modal = await slice.build('Modal', {
        sliceId: 'export-respuestas-dialog',
        title: '📤 Compartir respuestas',
        dismissable: true,
      });
      this.$modal.classList.add('export-respuestas-modal');
      document.body.appendChild(this.$modal);
  
      this.$desc = document.createElement('p');
      this.$desc.className = 'export-modal__desc';
      this.$desc.textContent = 'Elige cómo quieres compartir tus respuestas con el grupo:';
      this.$modal.appendBody(this.$desc);
  
      const actions = document.createElement('div');
      actions.className = 'export-modal__actions';
  
      this.$downloadBtn = await slice.build('Button', {
        value: '\u2B07 Descargar archivo de respuestas',
        variant: 'filled',
        onClick: () => { this._close(); slice.getComponent('RespuestasService').exportMineWithPrompt(); }
      });
      this.$downloadBtn.classList.add('export-modal__action');
  
      this.$printBtn = await slice.build('Button', {
        value: '\uD83D\uDDA8 Imprimir',
        variant: 'outlined',
        onClick: () => { this._close(); slice.getComponent('RespuestasService').exportPrint(); }
      });
      this.$printBtn.classList.add('export-modal__action');
  
      this.$copyBtn = await slice.build('Button', {
        value: '\uD83D\uDD17 Copiar enlace',
        variant: 'outlined',
        onClick: () => { this._close(); slice.getComponent('RespuestasService').copyShareLink(); }
      });
      this.$copyBtn.classList.add('export-modal__action');
  
      this.$emailBtn = await slice.build('Button', {
        value: '\u2709\uFE0F Enviar por correo',
        variant: 'outlined',
        onClick: () => { this._close(); slice.getComponent('RespuestasService').sendShareLinkEmail(); }
      });
      this.$emailBtn.classList.add('export-modal__action');
  
      actions.appendChild(this.$downloadBtn);
      actions.appendChild(this.$printBtn);
      actions.appendChild(this.$copyBtn);
      actions.appendChild(this.$emailBtn);
  
      if (typeof navigator.share === 'function') {
        this.$shareBtn = await slice.build('Button', {
          value: '\uD83D\uDCF1 Compartir',
          variant: 'filled',
          onClick: () => { this._close(); this._nativeShare(); }
        });
        this.$shareBtn.classList.add('export-modal__action');
        actions.appendChild(this.$shareBtn);
      }
  
      this.$modal.appendBody(actions);
    }
  
    _nativeShare() {
      const rs = slice.getComponent('RespuestasService');
      const settings = slice.getComponent('SettingsService');
      const autor = settings.getState().autor?.trim();
  
      const doShare = (name) => {
        const url = rs.getShareLink(name);
        const plantilla = slice.getComponent('PlantillaService');
        const plantillaNombre = plantilla.getNombre() || 'Conclave';
        navigator.share({
          title: `Mis respuestas — ${plantillaNombre}`,
          text: `${name} ha compartido sus respuestas para "${plantillaNombre}"`,
          url,
        }).catch(() => {});
      };
  
      if (autor) { doShare(autor); return; }
  
      slice.events.emit('confirm:request', {
        title: '¿Cuál es tu nombre?',
        message: 'Se incluye al compartir tus respuestas.',
        confirmLabel: 'Compartir',
        inputLabel: 'Tu nombre',
        inputPlaceholder: '¿Quién responde?',
        onConfirm: (name) => {
          if (!name) return;
          settings.setAutor(name);
          doShare(name);
        },
      });
    }
  
    async show() {
      await this._ensureModal();
      this.$modal.open = true;
    }
  
    _close() {
      this.$modal.open = false;
    }
  }
  
  window.ExportRespuestasModal = ExportRespuestasModal;
  return ExportRespuestasModal;
};

const SLICE_CLASS_FACTORY_SliceComponent_ExportService = () => {
  class ExportService {
    downloadRespuestas(autor, respuestas) {
      const safe = (autor || 'anonimo').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      this._download(`respuestas_${safe}`, { tipo: 'respuestas', autor: autor || 'Anónimo', respuestas });
    }
  
    downloadRespuestasFinal(autor, respuestas) {
      const label = autor ? `${autor} — lista final` : 'Consenso — lista final';
      const safe = (autor || 'consenso').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      this._download(`respuestas_final_${safe}`, { tipo: 'respuestas-final', autor: label, respuestas });
    }
  
    // Not called yet in Fase A — PlantillaBuilderView (Fase B) wires up
    // "Exportar Plantilla" to this.
    downloadPlantilla(plantilla) {
      const nombre = plantilla?.nombre || 'plantilla';
      const safe = nombre.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      this._download(`plantilla_${safe}`, {
        tipo: 'plantilla',
        nombre,
        autor: plantilla?.autor || '',
        email: plantilla?.email || '',
        atributos: plantilla?.atributos || [],
        temas: plantilla?.temas || [],
        opciones: plantilla?.opciones || [],
      });
    }
  
    _download(filename, extra) {
      const payload = {
        app: 'conclave',
        version: 2,
        fecha: new Date().toISOString(),
        ...extra,
      };
      slice.getComponent('FileDownloadService').download(
        `${filename}.json`,
        JSON.stringify(payload, null, 2),
        'application/json'
      );
    }
  }
  
  window.ExportService = ExportService;
  return ExportService;
};

const SLICE_CLASS_FACTORY_SliceComponent_FileDownloadService = () => {
  class FileDownloadService {
    download(filename, content, mimeType = 'text/plain') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }
  }
  
  window.FileDownloadService = FileDownloadService;
  return FileDownloadService;
};

const SLICE_CLASS_FACTORY_SliceComponent_FinalTally = () => {
  class FinalTally extends HTMLElement {
    constructor(props) {
      super();
      slice.attachTemplate(this);
      this.$root = this.querySelector('.final-tally');
      this._items = [];
      slice.controller.setComponentProps(this, props);
    }
  
    init() {
      this._html = slice.getComponent('HtmlService');
      this._render();
    }
  
    set items(arr) {
      this._items = arr || [];
      if (this.isConnected) this._render();
    }
  
    _render() {
      const items = this._items;
      if (!items.length) { this.$root.innerHTML = ''; return; }
      this.$root.innerHTML = this._html.sanitize(items.map((t) => `
        <div class="ft-chip" style="border-left-color:${t.color}">
          <div class="ft-top"><span class="color-dot" style="background:${t.color}"></span><span class="ft-name">${this._html.esc(t.nombre)}</span></div>
          <div class="ft-bottom"><span class="ft-count" style="color:${t.color}">${t.count}<small>/${t.max != null ? t.max : '–'}</small></span><span class="badge ${t.status}">${this._html.esc(t.badgeText)}</span></div>
        </div>
      `).join(''));
    }
  }
  
  window.FinalTally = FinalTally;
  if (!customElements.get('slice-finaltally')) { customElements.define('slice-finaltally', FinalTally); }
  
  return FinalTally;
};

const SLICE_CLASS_FACTORY_SliceComponent_HtmlService = () => {
  const domPurify = __sliceResolveDefaultExport(__sliceResolveBundleDependency("dompurify"), "dompurify", "dompurifyData");
  
  
  // Safe-HTML helpers for views — the fusion of the old FormatService (esc) and
  // SanitizeService (DOMPurify) into one core service, so a view caches ONE
  // instance instead of two, with no `.bind` and no double getComponent:
  //
  //   this._html = slice.getComponent('HtmlService');           // once, in init()
  //   this.$root.innerHTML = this._html.sanitize(`...${this._html.esc(x)}...`);
  //
  // The innerHTML assignment stays EXPLICIT in the view (no hidden setHtml) —
  // this service only provides the pure functions:
  //   • esc()      encodes individual dynamic tokens as they're interpolated.
  //   • sanitize() is the final net right before an innerHTML assignment, on top
  //     of esc(), against Plantilla/Respuestas JSON imported from other devices.
  class HtmlService {
    esc(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
      ));
    }
  
    sanitize(html) {
      return domPurify.sanitize(html == null ? '' : String(html));
    }
  
    // Converts a subset of Markdown to HTML for rendering texto_libre responses.
    // Supports: **bold**, *italic*, - bullet lists, 1. ordered lists, paragraphs.
    markdownToHtml(md) {
      if (!md) return '';
      let html = String(md);
  
      // Escape HTML tags in the Markdown source first
      html = html.replace(/[&<>]/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]
      ));
  
      // Bold and italic
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
      // Split into lines for list/paragraph processing
      const lines = html.split('\n');
      const result = [];
      let inUl = false;
      let inOl = false;
  
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const bulletMatch = line.match(/^-\s+(.*)/);
        const olistMatch = line.match(/^\d+\.\s+(.*)/);
  
        if (bulletMatch) {
          if (inOl) { result.push('</ol>'); inOl = false; }
          if (!inUl) { result.push('<ul>'); inUl = true; }
          result.push('<li>' + bulletMatch[1] + '</li>');
        } else if (olistMatch) {
          if (inUl) { result.push('</ul>'); inUl = false; }
          if (!inOl) { result.push('<ol>'); inOl = true; }
          result.push('<li>' + olistMatch[1] + '</li>');
        } else {
          if (inUl) { result.push('</ul>'); inUl = false; }
          if (inOl) { result.push('</ol>'); inOl = false; }
          const trimmed = line.trim();
          if (trimmed) {
            result.push('<p>' + trimmed + '</p>');
          }
        }
      }
  
      if (inUl) result.push('</ul>');
      if (inOl) result.push('</ol>');
  
      return result.join('\n');
    }
  }
  
  window.HtmlService = HtmlService;
  return HtmlService;
};

const SLICE_CLASS_FACTORY_SliceComponent_ImportDrop = () => {
  class ImportDrop extends HTMLElement {
    constructor(props) {
      super();
      slice.attachTemplate(this);
      this.$drop = this.querySelector('#drop');
      this.$input = this.querySelector('.import-drop__input');
      slice.controller.setComponentProps(this, props);
    }
  
    init() {
      this.$drop.onclick = () => this.$input.click();
      this.$input.onchange = () => {
        this._onFiles?.(this.$input.files);
        this.$input.value = '';
      };
      ['dragover', 'dragenter'].forEach((ev) => {
        this.$drop.addEventListener(ev, (e) => { e.preventDefault(); this.$drop.classList.add('drag'); });
      });
      ['dragleave', 'drop'].forEach((ev) => {
        this.$drop.addEventListener(ev, (e) => { e.preventDefault(); this.$drop.classList.remove('drag'); });
      });
      this.$drop.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer?.files) this._onFiles?.(e.dataTransfer.files);
      });
    }
  
    set onFiles(cb) { this._onFiles = cb; }
  
    set accept(val) { this.$input.accept = val; }
  
    set multiple(val) { this.$input.multiple = val; }
  }
  
  window.ImportDrop = ImportDrop;
  if (!customElements.get('slice-importdrop')) { customElements.define('slice-importdrop', ImportDrop); }
  
  return ImportDrop;
};

const SLICE_CLASS_FACTORY_SliceComponent_Input = () => {
  class Input extends HTMLElement {
  
     static props = {
        placeholder: { 
           type: 'string', 
           default: '', 
           required: false 
        },
        value: { 
           type: 'string', 
           default: '', 
           required: false 
        },
        type: { 
           type: 'string', 
           default: 'text' 
        },
        required: { 
           type: 'boolean', 
           default: false 
        },
        disabled: { 
           type: 'boolean', 
           default: false 
        },
        secret: { 
           type: 'boolean', 
           default: false 
        },
        conditions: { 
           type: 'object', 
           default: null 
        }
     };
  
     constructor(props) {
        super();
        slice.attachTemplate(this);
        this.$inputContainer = this.querySelector('.slice_input');
        this.$input = this.querySelector('input');
        this.$placeholder = this.querySelector('.slice_input_placeholder');
        this.$eyeIcon = this.querySelector('.slice_eye_icon');
  
        slice.controller.setComponentProps(this, props);
     }
  
     init() {
        // Static props ensure type has a default value
        this.$input.type = this.type;
  
        // Set up placeholder behavior
        if (this.placeholder) {
           this.$placeholder.textContent = this.placeholder;
        }
  
        // ✅ AÑADIDO: Set up default value
        if (this.value) {
           this.$input.value = this.value;
           this.updateInputState();
        }
  
        // Set up disabled state
        this.$input.disabled = this.disabled;
  
        // Set up required state
        if (this.required) {
           this.$inputContainer.classList.add('required');
        }
  
        // Set up secret functionality for password fields
        if (this.secret && this.type === 'password') {
           this.setupSecretToggle();
        }
  
        // Set up conditions if provided
        if (this.conditions) {
           this.setupConditions();
        }
  
        // Set up event listeners
        this.$input.addEventListener('input', () => {
           this.updateInputState();
        });
  
        // ✅ AÑADIDO: Permitir clic en el placeholder para enfocar el input
        this.$placeholder.addEventListener('click', () => {
           this.$input.focus();
        });
  
        // ✅ AÑADIDO: También permitir clic en el contenedor para enfocar el input
        this.$inputContainer.addEventListener('click', () => {
           this.$input.focus();
        });
  
        // Floating label: sube el placeholder también al enfocar
        this.$input.addEventListener('focus', () => {
           this.$placeholder.classList.add('slice_input_focus');
        });
        this.$input.addEventListener('blur', () => {
           this.$placeholder.classList.remove('slice_input_focus');
        });
     }
  
     setupSecretToggle() {
        // Idempotent: this runs from both the `secret` setter and init(); only wire once.
        if (!this.$eyeIcon || this._secretToggleReady) return;
        this._secretToggleReady = true;
  
        this.$eyeIcon.style.display = 'block';
        this.$eyeIcon.textContent = '👁️';
        this.$eyeIcon.setAttribute('aria-pressed', 'false');
  
        const toggleVisibility = () => {
           const revealed = this.$input.type === 'text';
           this.$input.type = revealed ? 'password' : 'text';
           this.$eyeIcon.textContent = revealed ? '👁️' : '🙈';
           this.$eyeIcon.setAttribute('aria-pressed', String(!revealed));
        };
  
        this.$eyeIcon.addEventListener('click', toggleVisibility);
        // Keyboard support for the non-native toggle (Enter/Space), per a11y baseline §9.
        this.$eyeIcon.addEventListener('keydown', (event) => {
           if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleVisibility();
           }
        });
     }
  
     setupConditions() {
        const {
           regex,
           minLength = 0,
           maxLength = Infinity,
           minMinusc = 0,
           maxMinusc = Infinity,
           minMayusc = 0,
           maxMayusc = Infinity,
           minNumber = 0,
           maxNumber = Infinity,
           minSymbol = 0,
           maxSymbol = Infinity
        } = this.conditions;
  
        let regexPattern;
        if (regex) {
           regexPattern = regex;
        } else {
           regexPattern = 
              `^(?=(?:.*[a-z]){${minMinusc},${maxMinusc}})` +
              `(?=(?:.*[A-Z]){${minMayusc},${maxMayusc}})` +
              `(?=(?:.*\\d){${minNumber},${maxNumber}})` +
              `(?=(?:.*[\\W$]){${minSymbol},${maxSymbol}})` +
              `.{${minLength},${maxLength}}$`;
        }
  
        this._conditions = new RegExp(regexPattern);
     }
  
     updateInputState() {
        if (this.$input.value !== '') {
           this.$placeholder.classList.add('slice_input_value');
           this.triggerSuccess();
        } else {
           this.$placeholder.classList.remove('slice_input_value');
           if (this.required) {
              this.triggerError();
           }
        }
     }
  
     validateValue() {
        if (this._conditions && !this._conditions.test(this.$input.value)) {
           this.triggerError();
           return false;
        }
        this.triggerSuccess();
        return true;
     }
  
     clear() {
        if (this.$input.value !== '') {
           this.$input.value = '';
           this.$placeholder.className = 'slice_input_placeholder';
        }
     }
  
     triggerSuccess() {
        this.$inputContainer.classList.remove('required', 'error');
     }
  
     triggerError() {
        this.$inputContainer.classList.add('error', 'required');
        setTimeout(() => {
           this.$inputContainer.classList.remove('error');
        }, 500);
     }
  
     // Getters and setters for dynamic prop updates
     get value() {
        return this.$input.value;
     }
  
     set value(newValue) {
        this.$input.value = newValue;
        this.updateInputState();
     }
  
     get placeholder() {
        return this._placeholder;
     }
  
     set placeholder(value) {
        this._placeholder = value;
        if (this.$placeholder) {
           this.$placeholder.textContent = value;
        }
     }
  
     get type() {
        return this._type;
     }
  
     set type(value) {
        this._type = value;
        if (this.$input) {
           this.$input.type = value;
        }
     }
  
     get required() {
        return this._required;
     }
  
     set required(value) {
        this._required = value;
        if (this.$inputContainer) {
           this.$inputContainer.classList.toggle('required', value);
        }
     }
  
     get disabled() {
        return this._disabled;
     }
  
     set disabled(value) {
        this._disabled = value;
        if (this.$input) {
           this.$input.disabled = value;
        }
     }
  
     get secret() {
        return this._secret;
     }
  
     set secret(value) {
        this._secret = value;
        if (value && this.type === 'password') {
           this.setupSecretToggle();
        }
     }
  
     get conditions() {
        return this._conditions;
     }
  
     set conditions(value) {
        this._conditions = value;
        if (value) {
           this.setupConditions();
        }
     }
  }
  
  window.Input = Input;
  if (!customElements.get('slice-input')) { customElements.define('slice-input', Input); }
  return Input;
};

const __templateElement_SliceComponent_ConfirmActionModal = document.createElement('template');
__templateElement_SliceComponent_ConfirmActionModal.innerHTML = "";
const __templateElement_SliceComponent_ConsensoService = document.createElement('template');
__templateElement_SliceComponent_ConsensoService.innerHTML = "";
const __templateElement_SliceComponent_DashboardView = document.createElement('template');
__templateElement_SliceComponent_DashboardView.innerHTML = "<div class=\"dashboard-view\"></div>\r\n";
const __templateElement_SliceComponent_DomService = document.createElement('template');
__templateElement_SliceComponent_DomService.innerHTML = "";
const __templateElement_SliceComponent_DragDropService = document.createElement('template');
__templateElement_SliceComponent_DragDropService.innerHTML = "";
const __templateElement_SliceComponent_DropDown = document.createElement('template');
__templateElement_SliceComponent_DropDown.innerHTML = "<div class=\"slice_dropdown\">\r\n  <label class=\"slice_dropdown_label\"></label>\r\n  <div class=\"caret\"></div>\r\n</div>\r\n<div class=\"slice_dropbox\"></div>\r\n";
const __templateElement_SliceComponent_EmptyState = document.createElement('template');
__templateElement_SliceComponent_EmptyState.innerHTML = "<div class=\"empty-state\">\r\n  <div class=\"empty-state__icon\" data-el=\"icon\"></div>\r\n  <h3 data-el=\"title\"></h3>\r\n  <p data-el=\"description\"></p>\r\n  <span data-el=\"btnSlot\"></span>\r\n</div>\r\n";
const __templateElement_SliceComponent_EnhancedEditor = document.createElement('template');
__templateElement_SliceComponent_EnhancedEditor.innerHTML = "<div class=\"md-editor\">\n  <div class=\"md-editor-toolbar\" data-md-toolbar>\n    <button class=\"md-btn\" data-md-cmd=\"bold\" title=\"Negrita\"><strong>B</strong></button>\n    <button class=\"md-btn\" data-md-cmd=\"italic\" title=\"Cursiva\"><em>I</em></button>\n    <span class=\"md-sep\"></span>\n    <button class=\"md-btn\" data-md-cmd=\"list\" title=\"Lista con viñetas\">•</button>\n    <button class=\"md-btn\" data-md-cmd=\"olist\" title=\"Lista numerada\">1.</button>\n  </div>\n  <textarea class=\"md-editor-textarea\" data-md-textarea></textarea>\n</div>\n";
const __templateElement_SliceComponent_ExportRespuestasModal = document.createElement('template');
__templateElement_SliceComponent_ExportRespuestasModal.innerHTML = "";
const __templateElement_SliceComponent_ExportService = document.createElement('template');
__templateElement_SliceComponent_ExportService.innerHTML = "";
const __templateElement_SliceComponent_FileDownloadService = document.createElement('template');
__templateElement_SliceComponent_FileDownloadService.innerHTML = "";
const __templateElement_SliceComponent_FinalTally = document.createElement('template');
__templateElement_SliceComponent_FinalTally.innerHTML = "<div class=\"final-tally\"></div>\r\n";
const __templateElement_SliceComponent_HtmlService = document.createElement('template');
__templateElement_SliceComponent_HtmlService.innerHTML = "";
const __templateElement_SliceComponent_ImportDrop = document.createElement('template');
__templateElement_SliceComponent_ImportDrop.innerHTML = "<div class=\"import-drop\" id=\"drop\">\r\n  <div class=\"import-drop__prompt\">⬆ Arrastra aquí los archivos o haz clic para seleccionarlos</div>\r\n  <div class=\"import-drop__hint\">Puedes importar varios a la vez</div>\r\n  <input type=\"file\" class=\"import-drop__input\" accept=\"application/json,.json\" multiple style=\"display:none\" />\r\n</div>\r\n";
const __templateElement_SliceComponent_Input = document.createElement('template');
__templateElement_SliceComponent_Input.innerHTML = "<div class=\"slice_input\">\r\n  <label class=\"slice_input_placeholder\"></label>\r\n  <input class=\"input_area\" type=\"text\" />\r\n  <span class=\"slice_eye_icon\" role=\"button\" tabindex=\"0\" aria-label=\"Toggle password visibility\"></span>\r\n</div>";

export async function registerAll(controller, stylesManager) {
  if (!controller.classes.has("ConfirmActionModal")) {
    controller.classes.set("ConfirmActionModal", SLICE_CLASS_FACTORY_SliceComponent_ConfirmActionModal());
  }
  if (!controller.classes.has("ConsensoService")) {
    controller.classes.set("ConsensoService", SLICE_CLASS_FACTORY_SliceComponent_ConsensoService());
  }
  if (!controller.classes.has("DashboardView")) {
    controller.classes.set("DashboardView", SLICE_CLASS_FACTORY_SliceComponent_DashboardView());
  }
  if (!controller.classes.has("DomService")) {
    controller.classes.set("DomService", SLICE_CLASS_FACTORY_SliceComponent_DomService());
  }
  if (!controller.classes.has("DragDropService")) {
    controller.classes.set("DragDropService", SLICE_CLASS_FACTORY_SliceComponent_DragDropService());
  }
  if (!controller.classes.has("DropDown")) {
    controller.classes.set("DropDown", SLICE_CLASS_FACTORY_SliceComponent_DropDown());
  }
  if (!controller.classes.has("EmptyState")) {
    controller.classes.set("EmptyState", SLICE_CLASS_FACTORY_SliceComponent_EmptyState());
  }
  if (!controller.classes.has("EnhancedEditor")) {
    controller.classes.set("EnhancedEditor", SLICE_CLASS_FACTORY_SliceComponent_EnhancedEditor());
  }
  if (!controller.classes.has("ExportRespuestasModal")) {
    controller.classes.set("ExportRespuestasModal", SLICE_CLASS_FACTORY_SliceComponent_ExportRespuestasModal());
  }
  if (!controller.classes.has("ExportService")) {
    controller.classes.set("ExportService", SLICE_CLASS_FACTORY_SliceComponent_ExportService());
  }
  if (!controller.classes.has("FileDownloadService")) {
    controller.classes.set("FileDownloadService", SLICE_CLASS_FACTORY_SliceComponent_FileDownloadService());
  }
  if (!controller.classes.has("FinalTally")) {
    controller.classes.set("FinalTally", SLICE_CLASS_FACTORY_SliceComponent_FinalTally());
  }
  if (!controller.classes.has("HtmlService")) {
    controller.classes.set("HtmlService", SLICE_CLASS_FACTORY_SliceComponent_HtmlService());
  }
  if (!controller.classes.has("ImportDrop")) {
    controller.classes.set("ImportDrop", SLICE_CLASS_FACTORY_SliceComponent_ImportDrop());
  }
  if (!controller.classes.has("Input")) {
    controller.classes.set("Input", SLICE_CLASS_FACTORY_SliceComponent_Input());
  }
  if (!controller.templates.has("ConfirmActionModal")) {
    controller.templates.set("ConfirmActionModal", __templateElement_SliceComponent_ConfirmActionModal);
  }
  if (!controller.templates.has("ConsensoService")) {
    controller.templates.set("ConsensoService", __templateElement_SliceComponent_ConsensoService);
  }
  if (!controller.templates.has("DashboardView")) {
    controller.templates.set("DashboardView", __templateElement_SliceComponent_DashboardView);
  }
  if (!controller.templates.has("DomService")) {
    controller.templates.set("DomService", __templateElement_SliceComponent_DomService);
  }
  if (!controller.templates.has("DragDropService")) {
    controller.templates.set("DragDropService", __templateElement_SliceComponent_DragDropService);
  }
  if (!controller.templates.has("DropDown")) {
    controller.templates.set("DropDown", __templateElement_SliceComponent_DropDown);
  }
  if (!controller.templates.has("EmptyState")) {
    controller.templates.set("EmptyState", __templateElement_SliceComponent_EmptyState);
  }
  if (!controller.templates.has("EnhancedEditor")) {
    controller.templates.set("EnhancedEditor", __templateElement_SliceComponent_EnhancedEditor);
  }
  if (!controller.templates.has("ExportRespuestasModal")) {
    controller.templates.set("ExportRespuestasModal", __templateElement_SliceComponent_ExportRespuestasModal);
  }
  if (!controller.templates.has("ExportService")) {
    controller.templates.set("ExportService", __templateElement_SliceComponent_ExportService);
  }
  if (!controller.templates.has("FileDownloadService")) {
    controller.templates.set("FileDownloadService", __templateElement_SliceComponent_FileDownloadService);
  }
  if (!controller.templates.has("FinalTally")) {
    controller.templates.set("FinalTally", __templateElement_SliceComponent_FinalTally);
  }
  if (!controller.templates.has("HtmlService")) {
    controller.templates.set("HtmlService", __templateElement_SliceComponent_HtmlService);
  }
  if (!controller.templates.has("ImportDrop")) {
    controller.templates.set("ImportDrop", __templateElement_SliceComponent_ImportDrop);
  }
  if (!controller.templates.has("Input")) {
    controller.templates.set("Input", __templateElement_SliceComponent_Input);
  }
  if (!stylesManager.__sliceRegisteredComponentStyles) {
    stylesManager.__sliceRegisteredComponentStyles = new Set();
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("ConfirmActionModal")) {
    stylesManager.registerComponentStyles("ConfirmActionModal", "");
    stylesManager.__sliceRegisteredComponentStyles.add("ConfirmActionModal");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("ConsensoService")) {
    stylesManager.registerComponentStyles("ConsensoService", "");
    stylesManager.__sliceRegisteredComponentStyles.add("ConsensoService");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("DashboardView")) {
    stylesManager.registerComponentStyles("DashboardView", "/* Header: title only, full width */\r\nslice-dashboardview .dash-header { margin-bottom: 10px; }\r\n\r\n/* Info row: share button + plantilla badge side by side */\r\nslice-dashboardview .dash-info-row {\r\n  display: flex; align-items: center; gap: 12px; margin: 0 0 8px; flex-wrap: wrap;\r\n}\r\n\r\n/* Plantilla identity — name badge + meta directly in the info row */\r\nslice-dashboardview .dash-plantilla__name {\r\n  font-family: var(--font-display); font-size: 14px; font-weight: 600;\r\n  padding: 4px 12px; border-radius: 999px; white-space: nowrap; overflow: hidden;\r\n  text-overflow: ellipsis; max-width: 220px;\r\n  background: var(--panel-background-color); border: 2px solid var(--font-primary-color);\r\n}\r\nslice-dashboardview .dash-plantilla__meta { font-size: 12px; color: var(--font-secondary-color); font-weight: 600; white-space: nowrap; }\r\n\r\n/* Completion doughnut — built once via ChartService (wraps vendored\r\n   Chart.js), updated in place on every _refresh(). The canvas can't read\r\n   var(--x) tokens directly (see ChartService.themeColor), so its colors\r\n   are baked in at build time from the resolved theme values. */\r\nslice-dashboardview .stat-card--chart { display: flex; flex-direction: column; }\r\nslice-dashboardview .dash-chart-wrap { position: relative; flex: 1; min-height: 84px; margin-top: 4px; }\r\nslice-dashboardview .dash-chart-pct {\r\n  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);\r\n  font-family: var(--font-display); font-size: 20px; font-weight: 600; color: var(--font-primary-color);\r\n  pointer-events: none;\r\n}\r\n\r\nslice-dashboardview .tema-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 16px; }\r\nslice-dashboardview .tema-card {\r\n  background: var(--panel-background-color); border: 2px solid var(--font-primary-color); border-radius: var(--card-border-radius); padding: 16px;\r\n  box-shadow: var(--box-shadow-primary); position: relative; overflow: hidden; cursor: pointer;\r\n}\r\nslice-dashboardview .tema-card:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--font-primary-color); }\r\nslice-dashboardview .tema-card:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 var(--font-primary-color); }\r\nslice-dashboardview .tema-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: var(--tema-color, var(--primary-color)); }\r\nslice-dashboardview .tema-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }\r\nslice-dashboardview .tema-head h3 { margin: 0; font-size: 15px; display: flex; align-items: center; gap: 8px; }\r\nslice-dashboardview .tema-count { font-size: 22px; font-weight: 700; }\r\nslice-dashboardview .tema-count small { font-size: 13px; color: var(--font-secondary-color); font-weight: 500; }\r\nslice-dashboardview .tema-meta { color: var(--font-secondary-color); font-size: 12px; margin: 6px 0 10px; }\r\nslice-dashboardview .badge-slot { margin-top: 10px; }\r\nslice-dashboardview .tema-lider { font-size: 12px; color: var(--font-secondary-color); margin-top: 6px; font-weight: 600; }\r\n\r\n\r\n/* This view's stat-grid has up to 5 cards (completion chart + 4 data cards; the two reparto cards hide when there are no Asignación temas) —\r\n   sliceStyles.css's shared .stat-grid nth-child rule only accounts for 4 and\r\n   is also used by CompareCarousel/CompareView/LandingView, so it can't just\r\n   be edited there. Override explicitly here instead of relying on position\r\n   math matching across two files. */\r\nslice-dashboardview .stat-grid .stat-card:nth-child(1)::before,\r\nslice-dashboardview .stat-grid .stat-card:nth-child(2)::before { background: var(--primary-color); }\r\nslice-dashboardview .stat-grid .stat-card:nth-child(3)::before { background: var(--success-color); }\r\nslice-dashboardview .stat-grid .stat-card:nth-child(4)::before { background: var(--secondary-color); }\r\nslice-dashboardview .stat-grid .stat-card:nth-child(5)::before { background: var(--warning-color); }\r\n\r\n@media (max-width: 760px) {\r\n  slice-dashboardview .stat-grid { grid-template-columns: repeat(2,1fr); }\r\n  slice-dashboardview .dash-header { margin-bottom: 6px; }\r\n  slice-dashboardview .dash-info-row > * { flex: none; }\r\n  slice-dashboardview .dash-info-row [data-el=\"shareBtnSlot\"] slice-button .slice_button { padding: 5px 12px; font-size: 12px; }\r\n  slice-dashboardview .dash-plantilla__name { font-size: 12px; padding: 3px 10px; max-width: 150px; }\r\n  slice-dashboardview .dash-plantilla__meta { font-size: 11px; }\r\n  slice-dashboardview .tema-card { padding: 12px; }\r\n  slice-dashboardview .tema-count { font-size: 18px; }\r\n  slice-dashboardview .dash-section-title { font-size: 15px; margin-top: 24px; }\r\n  slice-dashboardview .texto-row { padding: 8px 10px; }\r\n}\r\n\r\nslice-dashboardview .texto-list { display: flex; flex-direction: column; gap: 8px; }\r\nslice-dashboardview .texto-row {\r\n  display: flex; align-items: center; justify-content: space-between; gap: 10px;\r\n  background: var(--panel-background-color); border: 1.5px solid var(--border-color); border-radius: 10px;\r\n  padding: 10px 14px;\r\n}\r\nslice-dashboardview .texto-row__name { font-size: 13px; font-weight: 600; }\r\n\r\n/* Tema opciones modal — lives in <body> so NOT scoped under slice-dashboardview */\r\n.tema-opcion-list {\r\n  display: flex; flex-direction: column;\r\n  gap: 6px; padding: 4px 0;\r\n}\r\n.tema-opcion-item {\r\n  display: flex; align-items: center; gap: 10px;\r\n  padding: 10px 14px; border-radius: 999px;\r\n  background: var(--panel-alt-background-color);\r\n  font-size: 13px; font-weight: 600;\r\n  border: 1.5px solid var(--border-color);\r\n}\r\n.tema-opcion-item .nm { min-width: 0; }\r\n.tema-opcion-item.is-lider { border-color: var(--font-primary-color); background: var(--panel-background-color); }\r\n.lider-badge {\r\n  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;\r\n  padding: 2px 8px; border-radius: 999px; background: var(--primary-color); color: var(--primary-color-contrast);\r\n  flex-shrink: 0; margin-left: auto;\r\n}\r\n\r\n/* Modo section headings (Asignación / Votación / Ranking / Texto libre) */\r\nslice-dashboardview .dash-section-title { font-size: 16px; margin-top: 30px; }\r\n\r\n\r\n");
    stylesManager.__sliceRegisteredComponentStyles.add("DashboardView");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("DomService")) {
    stylesManager.registerComponentStyles("DomService", "");
    stylesManager.__sliceRegisteredComponentStyles.add("DomService");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("DragDropService")) {
    stylesManager.registerComponentStyles("DragDropService", "");
    stylesManager.__sliceRegisteredComponentStyles.add("DragDropService");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("DropDown")) {
    stylesManager.registerComponentStyles("DropDown", "slice-dropdown {\r\n  position: relative;\r\n  display: inline-block;\r\n  font-family: var(--font-body);\r\n  color: inherit;\r\n}\r\n\r\nslice-dropdown .slice_dropdown {\r\n  display: inline-flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  gap: 4px;\r\n  padding: 9px 16px;\r\n  cursor: pointer;\r\n  user-select: none;\r\n  color: var(--font-primary-color);\r\n  background: var(--panel-background-color);\r\n  border-radius: 10px;\r\n  border: 2px solid var(--font-primary-color);\r\n  box-shadow: 3px 3px 0 var(--font-primary-color);\r\n  font-family: var(--font-body);\r\n  font-size: 13px;\r\n  font-weight: 700;\r\n  transition: transform .08s ease, box-shadow .08s ease;\r\n}\r\n\r\nslice-dropdown .slice_dropdown:hover {\r\n  transform: translate(-1px, -1px);\r\n  box-shadow: 4px 4px 0 var(--font-primary-color);\r\n}\r\n\r\nslice-dropdown .slice_dropdown:active {\r\n  transform: translate(2px, 2px);\r\n  box-shadow: 1px 1px 0 var(--font-primary-color);\r\n}\r\n\r\nslice-dropdown .slice_dropdown_label {\r\n  cursor: pointer;\r\n  color: inherit;\r\n  white-space: nowrap;\r\n}\r\n\r\nslice-dropdown .caret {\r\n  margin-left: 2px;\r\n  border-top-color: currentColor;\r\n}\r\n\r\nslice-dropdown .slice_dropbox {\r\n  position: absolute;\r\n  top: calc(100% + 6px);\r\n  right: 0;\r\n  left: auto;\r\n  z-index: 50;\r\n  display: flex;\r\n  flex-direction: column;\r\n  min-width: 100%;\r\n  width: max-content;\r\n  max-width: 280px;\r\n  padding: 6px;\r\n  list-style: none;\r\n  color: var(--font-primary-color);\r\n  background: var(--panel-background-color);\r\n  border: 2px solid var(--font-primary-color);\r\n  border-radius: 12px;\r\n  box-shadow: var(--box-shadow-primary);\r\n  visibility: hidden;\r\n  opacity: 0;\r\n  transform: translateY(-4px);\r\n  max-height: 0;\r\n  overflow: hidden;\r\n  pointer-events: none;\r\n  transition: opacity .15s ease, transform .15s ease, visibility 0s linear .15s;\r\n}\r\n\r\nslice-dropdown .slice_dropbox_open {\r\n  visibility: visible;\r\n  opacity: 1;\r\n  transform: translateY(0);\r\n  max-height: 260px;\r\n  overflow-y: auto;\r\n  pointer-events: auto;\r\n  transition: opacity .15s ease, transform .15s ease;\r\n}\r\n\r\nslice-dropdown .slice_dropbox div a {\r\n  display: block;\r\n  width: 100%;\r\n  padding: 10px 14px;\r\n  border-radius: 8px;\r\n  color: var(--font-primary-color);\r\n  text-decoration: none;\r\n  white-space: nowrap;\r\n  font-size: 13px;\r\n  font-weight: 600;\r\n  transition: background .15s ease;\r\n}\r\n\r\nslice-dropdown .slice_dropbox div a:hover {\r\n  background: var(--panel-alt-background-color);\r\n  color: var(--font-primary-color);\r\n}\r\n\r\nslice-dropdown .slice_dropbox::-webkit-scrollbar {\r\n  width: 5px;\r\n}\r\nslice-dropdown .slice_dropbox::-webkit-scrollbar-thumb {\r\n  background: var(--secondary-color);\r\n  border-radius: 999px;\r\n}\r\n\r\n@media (max-width: 760px) {\r\n  slice-dropdown .slice_dropbox {\r\n    left: 0;\r\n    right: auto;\r\n  }\r\n}\r\n");
    stylesManager.__sliceRegisteredComponentStyles.add("DropDown");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("EmptyState")) {
    stylesManager.registerComponentStyles("EmptyState", "slice-emptystate { display: block; }\r\nslice-emptystate .empty-state {\r\n  text-align: center; max-width: 420px; margin: 40px auto;\r\n  background: var(--panel-background-color); border: 2.5px solid var(--font-primary-color);\r\n  border-radius: var(--card-border-radius); padding: 36px 28px; box-shadow: var(--box-shadow-primary);\r\n}\r\nslice-emptystate .empty-state__icon {\r\n  width: 60px; height: 60px; margin: 0 auto 16px; border-radius: 16px;\r\n  background: var(--secondary-background-color); border: 2px solid var(--font-primary-color);\r\n  display: flex; align-items: center; justify-content: center; font-size: 28px;\r\n  transform: rotate(-5deg);\r\n}\r\nslice-emptystate .empty-state h3 { font-family: var(--font-display); font-size: 18px; font-weight: 600; margin: 0 0 10px; }\r\nslice-emptystate .empty-state p { font-size: 13.5px; line-height: 1.55; color: var(--font-secondary-color); margin: 0 0 20px; }\r\n");
    stylesManager.__sliceRegisteredComponentStyles.add("EmptyState");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("EnhancedEditor")) {
    stylesManager.registerComponentStyles("EnhancedEditor", "slice-enhancededitor { display: flex; flex-direction: column; }\n\nslice-enhancededitor .md-editor {\n  border: 2px solid var(--border-color);\n  border-radius: 12px;\n  overflow: hidden;\n  transition: border-color .15s;\n  display: flex; flex-direction: column;\n}\nslice-enhancededitor .md-editor:focus-within {\n  border-color: var(--primary-color);\n}\n\nslice-enhancededitor .md-editor-toolbar {\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  padding: 6px 8px;\n  background: var(--panel-background-color);\n  border-bottom: 1.5px solid var(--border-color);\n}\n\nslice-enhancededitor .md-btn {\n  width: 28px; height: 28px;\n  display: inline-flex; align-items: center; justify-content: center;\n  border: 0; border-radius: 6px;\n  background: transparent;\n  color: var(--font-primary-color);\n  font-family: var(--font-body);\n  font-size: 13px;\n  cursor: pointer;\n  transition: background .1s;\n}\nslice-enhancededitor .md-btn:hover { background: var(--secondary-background-color); }\nslice-enhancededitor .md-btn:active { background: color-mix(in srgb, var(--primary-color) 12%, transparent); }\nslice-enhancededitor .md-btn strong { font-size: 14px; }\nslice-enhancededitor .md-btn em { font-style: italic; font-size: 14px; }\n\nslice-enhancededitor .md-sep {\n  width: 1px; height: 18px;\n  background: var(--border-color);\n  margin: 0 4px;\n}\n\nslice-enhancededitor .md-editor-textarea {\n  width: 100%;\n  min-height: 130px;\n  padding: 14px 16px;\n  border: 0;\n  outline: none;\n  resize: vertical;\n  background: var(--panel-alt-background-color);\n  color: var(--font-primary-color);\n  font-family: var(--font-body);\n  font-size: 15px;\n  line-height: 1.6;\n  box-sizing: border-box;\n}\nslice-enhancededitor .md-editor-textarea::placeholder {\n  color: var(--font-secondary-color);\n}\n");
    stylesManager.__sliceRegisteredComponentStyles.add("EnhancedEditor");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("ExportRespuestasModal")) {
    stylesManager.registerComponentStyles("ExportRespuestasModal", "");
    stylesManager.__sliceRegisteredComponentStyles.add("ExportRespuestasModal");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("ExportService")) {
    stylesManager.registerComponentStyles("ExportService", "");
    stylesManager.__sliceRegisteredComponentStyles.add("ExportService");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("FileDownloadService")) {
    stylesManager.registerComponentStyles("FileDownloadService", "");
    stylesManager.__sliceRegisteredComponentStyles.add("FileDownloadService");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("FinalTally")) {
    stylesManager.registerComponentStyles("FinalTally", "slice-finaltally .final-tally { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 10px; }\r\nslice-finaltally .ft-chip { background: var(--panel-background-color); border: 2px solid var(--font-primary-color); border-radius: 12px; padding: 10px 12px; border-left-width: 5px; }\r\nslice-finaltally .ft-top { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; min-width: 0; }\r\nslice-finaltally .ft-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r\nslice-finaltally .ft-bottom { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 7px; }\r\nslice-finaltally .ft-count { font-family: var(--font-display); font-size: 17px; font-weight: 600; }\r\nslice-finaltally .ft-count small { font-family: var(--font-body); font-size: 11px; color: var(--font-secondary-color); font-weight: 500; }\r\n");
    stylesManager.__sliceRegisteredComponentStyles.add("FinalTally");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("HtmlService")) {
    stylesManager.registerComponentStyles("HtmlService", "");
    stylesManager.__sliceRegisteredComponentStyles.add("HtmlService");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("ImportDrop")) {
    stylesManager.registerComponentStyles("ImportDrop", "slice-importdrop .import-drop {\r\n  border: 2.5px dashed var(--font-primary-color); border-radius: var(--card-border-radius); padding: 28px; text-align: center;\r\n  color: var(--font-secondary-color); margin-bottom: 18px; cursor: pointer; transition: background .15s; background: var(--panel-background-color);\r\n}\r\nslice-importdrop .import-drop:hover, slice-importdrop .import-drop.drag { border-color: var(--primary-color); color: var(--font-primary-color); background: var(--secondary-background-color); }\r\nslice-importdrop .import-drop__prompt { font-size: 15px; font-weight: 600; }\r\nslice-importdrop .import-drop__hint { margin-top: 6px; font-size: 12px; }\r\n");
    stylesManager.__sliceRegisteredComponentStyles.add("ImportDrop");
  }
  if (!stylesManager.__sliceRegisteredComponentStyles.has("Input")) {
    stylesManager.registerComponentStyles("Input", "/* Encapsulated under the custom element so the input styles never leak.\r\n   PATCHED for Sticker Book (see DESIGN.md): the stock registry look (soft\r\n   --slice-border, focus glow ring, 25px stacked-form spacing) doesn't match\r\n   this app's thin-border-at-rest/bold-ink-on-focus language, and its 25px\r\n   margins fight every dense-row/flex-gap layout we actually use it in. If\r\n   Input is ever re-synced from the registry (`slice sync`), re-check this\r\n   file survived the overwrite — same caveat as the documented Modal.css\r\n   patch (see GOTCHAS.md). */\r\n\r\nslice-input {\r\n  display: block;\r\n}\r\n\r\nslice-input .slice_eye_icon {\r\n  /* Hidden by default; shown only for secret password inputs (see setupSecretToggle). */\r\n  display: none;\r\n  color: var(--primary-color);\r\n  position: absolute;\r\n  user-select: none;\r\n  cursor: pointer;\r\n  right: 10px;\r\n}\r\n\r\nslice-input .input_area::-webkit-inner-spin-button {\r\n  -webkit-appearance: none;\r\n  margin: 0;\r\n}\r\n\r\nslice-input .input_area {\r\n  color: var(--font-primary-color);\r\n  width: 100%;\r\n  background: none;\r\n  outline: none;\r\n  border: none;\r\n  font-family: var(--font-body, var(--font-family));\r\n  font-size: 14px;\r\n  font-weight: 500;\r\n}\r\n\r\nslice-input .slice_input {\r\n  display: flex;\r\n  align-items: center;\r\n  padding: 9px 12px;\r\n  max-width: 100%;\r\n  border-radius: 9px;\r\n  font-family: var(--font-body, var(--font-family));\r\n  border: 2px solid var(--border-color);\r\n  background-color: var(--panel-background-color, var(--primary-background-color));\r\n  margin: 0;\r\n  position: relative;\r\n  transition: border-color 0.15s ease;\r\n}\r\n\r\nslice-input .slice_input:focus-within {\r\n  border-color: var(--primary-color);\r\n  box-shadow: none;\r\n}\r\n\r\nslice-input .slice_input_placeholder {\r\n  color: var(--font-secondary-color);\r\n  font-size: 11px;\r\n  font-weight: 700;\r\n  text-transform: uppercase;\r\n  letter-spacing: .03em;\r\n  position: absolute;\r\n  top: 50%;\r\n  transform: translateY(-50%);\r\n  transition: all 0.2s ease;\r\n  user-select: none;\r\n  cursor: text;\r\n  pointer-events: none;\r\n}\r\n\r\n/* Floated (has-value/focused) state — sits clear ABOVE the 2px border with\r\n   its own background patch, \"notched-label\" style. The stock version relied\r\n   on a 25px top margin around the whole field to give the float room to\r\n   land in open space; removing that margin for Sticker Book's tighter\r\n   density (see this file's header comment) left the label floating right\r\n   on top of the border line instead — visually crossed out by it. */\r\nslice-input .slice_input_value,\r\nslice-input .slice_input_focus {\r\n  top: -0.85rem;\r\n  left: 10px;\r\n  transform: translateY(0) scale(0.8);\r\n  transition: all 0.2s ease;\r\n  background: var(--panel-background-color, var(--primary-background-color));\r\n  padding: 0 4px;\r\n  border-radius: 3px;\r\n}\r\n\r\nslice-input .required,\r\nslice-input .required label,\r\nslice-input .required input {\r\n  border-color: var(--danger-color);\r\n  --primary-color: var(--danger-color);\r\n}\r\n\r\nslice-input .disabled,\r\nslice-input .disabled label {\r\n  border-color: var(--disabled-color);\r\n  cursor: not-allowed;\r\n  pointer-events: none;\r\n  color: var(--disabled-color);\r\n}\r\n\r\nslice-input .disabled div {\r\n  background-color: var(--primary-color-shade);\r\n}\r\n\r\nslice-input .color_input {\r\n  border-radius: 100%;\r\n  height: 50px;\r\n  width: 50px;\r\n}\r\n\r\nslice-input .message {\r\n  color: var(--danger-color);\r\n  font-size: small;\r\n}\r\n\r\n@keyframes slice_input_shake {\r\n  0% {\r\n    transform: translateX(0);\r\n  }\r\n  25% {\r\n    transform: translateX(-5px) rotate(0.5deg);\r\n  }\r\n  50% {\r\n    transform: translateX(5px) rotate(-0.5deg);\r\n  }\r\n  75% {\r\n    transform: translateX(-3px) rotate(0.3deg);\r\n  }\r\n  100% {\r\n    transform: translateX(0);\r\n  }\r\n}\r\n\r\nslice-input .error {\r\n  --primary-color: var(--danger-color);\r\n  animation: slice_input_shake 0.5s infinite;\r\n}\r\n");
    stylesManager.__sliceRegisteredComponentStyles.add("Input");
  }
  if (!controller.componentCategories.has("ConfirmActionModal")) {
    controller.componentCategories.set("ConfirmActionModal", "Providers");
  }
  if (!controller.componentCategories.has("ConsensoService")) {
    controller.componentCategories.set("ConsensoService", "Domain");
  }
  if (!controller.componentCategories.has("DashboardView")) {
    controller.componentCategories.set("DashboardView", "AppComponents");
  }
  if (!controller.componentCategories.has("DomService")) {
    controller.componentCategories.set("DomService", "Core");
  }
  if (!controller.componentCategories.has("DragDropService")) {
    controller.componentCategories.set("DragDropService", "Providers");
  }
  if (!controller.componentCategories.has("DropDown")) {
    controller.componentCategories.set("DropDown", "Visual");
  }
  if (!controller.componentCategories.has("EmptyState")) {
    controller.componentCategories.set("EmptyState", "Visual");
  }
  if (!controller.componentCategories.has("EnhancedEditor")) {
    controller.componentCategories.set("EnhancedEditor", "Visual");
  }
  if (!controller.componentCategories.has("ExportRespuestasModal")) {
    controller.componentCategories.set("ExportRespuestasModal", "Providers");
  }
  if (!controller.componentCategories.has("ExportService")) {
    controller.componentCategories.set("ExportService", "Domain");
  }
  if (!controller.componentCategories.has("FileDownloadService")) {
    controller.componentCategories.set("FileDownloadService", "Core");
  }
  if (!controller.componentCategories.has("FinalTally")) {
    controller.componentCategories.set("FinalTally", "DataDisplay");
  }
  if (!controller.componentCategories.has("HtmlService")) {
    controller.componentCategories.set("HtmlService", "Core");
  }
  if (!controller.componentCategories.has("ImportDrop")) {
    controller.componentCategories.set("ImportDrop", "Visual");
  }
  if (!controller.componentCategories.has("Input")) {
    controller.componentCategories.set("Input", "Visual");
  }
}
