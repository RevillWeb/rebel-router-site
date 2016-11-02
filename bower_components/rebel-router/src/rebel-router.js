/**
 * Created by Leon Revill on 15/12/2015.
 * Blog: blog.revillweb.com
 * GitHub: https://github.com/RevillWeb
 * Twitter: @RevillWeb
 */

/**
 * The main router class and entry point to the router.
 */
class RebelRouter extends HTMLElement {

    /**
     * Main initialisation point of rbl-router
     */
    constructor(self) {
        self = super(self);
        self._previousRoute = null;
        self._basePath = null;
        self._routes = {};
        self._options = {};
        self._initialised = false;
        //Used to determine if we are half way through a render / transition
        self._renderLock = false;
        const addRoute = (event) => {
            //Prevent the route event from bubbling up any further
            event.stopImmediatePropagation();
            const route = event.detail;
            self._routes[route.path] = route.$element;
            let render = true;
            for (let i = 0; i < self.children.length; i++) {
                var $child = self.children[i];
                if ($child.initialised === false) {
                    render = false;
                }
            }
            if (render === true) {
                self._render();
            }
        };
        self.addEventListener("rbl-add-route", addRoute);
        return self;
    }

    _getBasePath() {
        const $element = RebelRouter.getParent(this, "rbl-router");
        if ($element !== null) {
            const $current = $element._current();
            if ($current !== null) {
                return $current.path;
            }
        }
        return null;
    }

    get routes() {
        return this._routes;
    }

    get options() {
        return this._options;
    }

    get params() {
        const $current = this._current();
        if ($current !== null) {
            return RebelRouter.getParamsFromUrl($current.regex, $current.path);
        }
        return null;
    }

    connectedCallback() {
        this._basePath = this._getBasePath();
        //Get options
        this._options = {
            "animation": (this.getAttribute("animation") == "true"),
            "shadowRoot": (this.getAttribute("shadow") == "true"),
            "inherit": (this.getAttribute("inherit") != "false"),
            "cache": (this.getAttribute("cache") != "false")
        };
        // if (this._options.cache !== false && 'serviceWorker' in navigator) {
        //     navigator.serviceWorker.register("bower_components/rebel-router/src/sw.js").then(function(registration) {
        //         // Registration was successful
        //         console.log(registration);
        //         console.log('ServiceWorker registration successful with scope: ', registration.scope);
        //     }).catch(function(err) {
        //         // registration failed :(
        //         console.log('ServiceWorker registration failed: ', err);
        //     });
        //
        // }
        RebelRouter.pathChange((path, isBack) => {
            if (this.options.animation === true) {
                if (isBack === true) {
                    this.classList.add("rbl-back");
                } else {
                    this.classList.remove("rbl-back");
                }
            }
            this._render();
        });
    }

    /**
     * Method used to get the current route object
     * @returns {*}
     */
    _current() {
        let path = RebelRouter.getPathFromUrl();
        if (this._basePath !== null) {
            path = path.replace(this._basePath, "");
        }
        for (const routeString in this._routes) {
            if (routeString !== "*") {
                const $route = this._routes[routeString];
                if ($route.regex.test(path)) {
                    return $route;
                }
            }
        }
        return (this._routes["*"] !== undefined) ? this._routes["*"] : null;
    }

    /**
     * Method called to render the current view
     */
    _render() {
        if (this._renderLock === true) return;
        const $current = this._current();
        if ($current !== null) {
            this._renderLock = true;
            if ($current !== this._previousRoute) {
                $current.load().then(() => {
                    let promises = [];
                    if (this._previousRoute !== null) {
                        promises.push($current.in(this._options.animation));
                    }
                    if (this._previousRoute !== null) {
                        promises.push(this._previousRoute.out(this._options.animation));
                    }
                    Promise.all(promises).then(() => {
                        this._renderLock = false;
                        this._previousRoute = $current;
                    }).catch((error) => {
                        this._renderLock = false;
                        throw new Error(error);
                    });
                });
            } else {
                $current.load().then(() => {
                    this._renderLock = false;
                });
            }
        }
    }

    /**
     * Static helper method to parse the query string from a url into an object.
     * @param url
     * @returns {{}}
     */
    static parseQueryString(url) {
        var result = {};
        if (url !== undefined) {
            var queryString = (url.indexOf("?") > -1) ? url.substr(url.indexOf("?") + 1, url.length) : null;
            if (queryString !== null) {
                queryString.split("&").forEach(function (part) {
                    if (!part) return;
                    part = part.replace("+", " ");
                    var eq = part.indexOf("=");
                    var key = eq > -1 ? part.substr(0, eq) : part;
                    var val = eq > -1 ? decodeURIComponent(part.substr(eq + 1)) : "";
                    var from = key.indexOf("[");
                    if (from == -1) result[decodeURIComponent(key)] = val;
                    else {
                        var to = key.indexOf("]");
                        var index = decodeURIComponent(key.substring(from + 1, to));
                        key = decodeURIComponent(key.substring(0, from));
                        if (!result[key]) result[key] = [];
                        if (!index) result[key].push(val);
                        else result[key][index] = val;
                    }
                });
            }
        }
        return result;
    }

    /**
     * Method used to register a callback to be called when the URL path changes.
     * @param callback
     */
    static _onRouteChange()  {
        /**
         *  event.oldURL and event.newURL would be better here but this doesn't work in IE :(
         */
        if (window.location.href != RebelRouter.oldURL) {
            RebelRouter.changeCallbacks.forEach(function(callback){
                callback(RebelRouter.getPathFromUrl(), RebelRouter.isBack);
            });
            RebelRouter.isBack = false;
        }
        RebelRouter.oldURL = window.location.href;
    }

    static pathChange(callback) {
        //Call it right away so that the callback has the latest route instantly
        callback(RebelRouter.getPathFromUrl(), RebelRouter.isBack);
        if (RebelRouter.changeCallbacks === undefined) {
            RebelRouter.changeCallbacks = [];
        }
        RebelRouter.changeCallbacks.push(callback);
        if (window.onhashchange === null) {
            window.addEventListener("rblback", function(){
                RebelRouter.isBack = true;
            });
            window.onhashchange = RebelRouter._onRouteChange;
        }
        if (window.onpopstate === null) {
            window.onpopstate = RebelRouter._onRouteChange;
        }
    }

    /**
     * Static helper method used to get the parameters from the provided route.
     * @param regex
     * @param routePath
     * @returns {{}}
     */
    static getParamsFromUrl(regex, routePath) {
        const path = RebelRouter.getPathFromUrl();
        let result = RebelRouter.parseQueryString(path);
        const re = /{(\w+)}/g;
        let results = [];
        let match;
        while (match = re.exec(routePath)) {
            results.push(match[1]);
        }
        if (regex !== null) {
            var results2 = regex.exec(path);
            results.forEach(function (item, idx) {
                result[item] = results2[idx + 1];
            });
        }
        return result;
    }

    /**
     * Static helper method used to get the path from the current URL.
     * @returns {*}
     */
    static getPathFromUrl() {
        return (!window.location.hash) ? window.location.pathname : window.location.hash.replace("#", "");
    }

    static importTemplate(url) {
        return new Promise((resolve, reject) => {
            if ('import' in document.createElement('link')) {
                //Browser supports HTML Imports so let's use'em!
                var $link = document.createElement("link");
                $link.setAttribute("rel", "import");
                $link.setAttribute("href", url);
                $link.setAttribute("async", "true");
                $link.addEventListener("load", () => {
                    const $template = $link.import.querySelector("template");
                    if ($template !== null) {
                        resolve($template);
                    } else {
                        reject("No template element found in '" + url + "'.");
                    }
                });
                $link.addEventListener("error", () => {
                    reject("An error occurred while trying to load '" + url + "'.");
                });
                document.head.appendChild($link);
            } else {
                reject("Sorry, your browser doesn't support HTML Imports.")
            }
        });
    }

    static interpolateString(string, data) {
        if (string.indexOf("${") > -1) {
            string = string.replace(/\${([^{}]*)}/g,
                function (a, b) {
                    var r = data[b];
                    return typeof r === 'string' || typeof r === 'number' ? r : a;
                }
            );
        }
        return string.replace(/\${(.*)}/, "");
    }

    static go(path) {
        window.history.pushState(null, null, path);
        RebelRouter._onRouteChange();
    }

    static getParent($element, tagName) {
        while ($element !== document && $element.parentNode) {
            $element = $element.parentNode;
            if ($element.nodeName.toLowerCase() == tagName) {
                return $element;
            }
        }
        return null;
    }

}

window.customElements.define("rbl-router", RebelRouter);

/**
 * Class which represents the rbl-route custom element
 */
class RebelRoute extends HTMLElement {
    constructor() {
        super();
        this._initialised = false;
        this._loaded = false;
        this._path = null;
        this._regex = null;
    }
    get initialised() {
        return this._initialised;
    }
    get path() {
        return this._path;
    }
    get regex() {
        return this._regex;
    }
    load() {
        return new Promise((resolve) => {
            this.style.display = "inherit";
            if (this._loaded === false) {
                this.appendChild(this.$template);
                this._loaded = true;
            }
            resolve();
        });
    }
    _setTransitionFallback(reject) {
        return setTimeout(() => {
            //If this happens then the transition never completed
            reject("Transition for route '" + this.path + "' never ended.");
        }, 5000);
    }
    in(animate) {
        return new Promise((resolve, reject) => {
            if (animate === true) {
                var fb = this._setTransitionFallback(reject);
                const onTransitionEnd = () => {
                    clearTimeout(fb);
                    this.removeEventListener('transitionend', onTransitionEnd);
                    this.classList.remove('enter');
                    this.classList.remove('complete');
                    this.style.display = "inherit";
                    resolve();
                };
                this.classList.add('rbl-animate');
                this.classList.add('enter');
                setTimeout(() => {
                    this.classList.add('complete');
                }, 100);
                this.addEventListener('transitionend', onTransitionEnd);
            } else {
                this.style.display = "inherit";
                resolve();
            }
        });
    }
    out(animate) {
        return new Promise((resolve, reject) => {
            if (animate === true) {
                var fb = this._setTransitionFallback(reject);
                const onTransitionEnd = () => {
                    clearTimeout(fb);
                    this.removeEventListener('transitionend', onTransitionEnd);
                    this.classList.remove('exit');
                    this.classList.remove('complete');
                    this.style.display = "none";
                    resolve();
                };
                this.classList.add('rbl-animate');
                this.classList.add('exit');
                setTimeout(() => {
                    this.classList.add('complete');
                }, 100);
                this.addEventListener('transitionend', onTransitionEnd);
            } else {
                this.style.display = "none";
                resolve();
            }
        });
    }
    _initialise() {
        return new Promise((resolve, reject) => {
            const _tplResource = this.getAttribute("template");
            const _tplInline = this.querySelector("template");
            if (_tplResource !== null) {
                RebelRouter.importTemplate(_tplResource).then((_tpl) => {
                    this.$template = document.importNode(_tpl.content, true);
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            } else if (_tplInline !== null) {
                this.$template = document.importNode(_tplInline.content, true);
                resolve();
            } else {
                let $template = document.createElement("template");
                $template.innerHTML = this.innerHTML;
                this.$template = document.importNode($template.content, true);
                resolve();
            }
        });
    }
    connectedCallback(defaults) {
        if (this._initialised === false) {
            this._initialise().then(() => {
                this.innerHTML = "";
                this._initialised = true;
                const path = this.getAttribute("path");
                let regex = null;
                if (path !== null) {
                    let regexString = "^" + path.replace(/{\w+}\/?/g, "(\\w+)\/?");
                    regexString += (regexString.indexOf("\\/?") > -1) ? "" : "\\/?" + "([?=&-\/\\w+]+)?$";
                    regex = new RegExp(regexString);
                }
                const detail = Object.assign({
                    "path": path,
                    "regex": regex,
                    "$element": this
                }, defaults);
                if (detail.path === null) {
                    throw Error("rbl-route requires a path attribute to be specified.")
                }
                this._path = detail.path;
                this._regex = detail.regex;
                this.dispatchEvent(new CustomEvent("rbl-add-route", {
                    "detail": detail,
                    "bubbles": true
                }));
            }).catch((error) => {
                console.error(error);
            });
        }
    }
    static parseRouteParams(string) {
        return RebelRouter.interpolateString(string, RebelRouter.getParamsFromUrl(this._regex, this._path));
    }
}
window.customElements.define("rbl-route", RebelRoute);

/**
 * Class which represents the rbl-default custom element
 */
class RebelDefault extends RebelRoute {
    connectedCallback() {
        super.connectedCallback({"path": "*"});
    }
}
window.customElements.define("rbl-default", RebelDefault);

/**
 * Represents the prototype for an anchor element which added functionality to perform a back transition.
 */
class RebelBackA extends HTMLAnchorElement {
    connectedCallback() {
        this.addEventListener("click", (event) => {
            const path = this.getAttribute("href");
            event.preventDefault();
            if (path !== undefined) {
                window.dispatchEvent(new CustomEvent('rblback'));
            }
            window.location.hash = path;
        });
    }
}
/**
 * Represents the prototype for an anchor element which ensures history API support instead of hash.
 */
class RebelLink extends HTMLElement {
    constructor(self) {
        self = super(self);
        self.addEventListener("click", (event) => {
            const path = this.getAttribute("href");
            event.preventDefault();
            RebelRouter.go(path);
        });
        return self;
    }
}
window.customElements.define("rbl-link", RebelLink, {extends: "a"});


/**
 * Represents the prototype for an anchor element which ensures history API support instead of hash.
 */
class RebelParams extends HTMLElement {
    constructor(self) {
        self = super(self);
        self._name = null;
        self._$router = null;
        return self;
    }
    connectedCallback() {
        this._$template = this.innerHTML;
        this._$router = RebelRouter.getParent(this, "rbl-router");
        if (this._$router !== null) {
            RebelRouter.pathChange(() => {
                if (this._$router !== null) {
                    this.innerText = RebelRouter.interpolateString(this._$template, this._$router.params);
                }
            });
        }
    }
}
/**
 * Register the back button custom element
 */
window.customElements.define("rbl-params", RebelParams);