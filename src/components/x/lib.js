//
//	lib.js
//	auto-x
//
//	Created by Andrey Shpigunov on 03.09.2024.
//


class Lib {
    
    constructor() {
        this.loadedScripts = [];
    }
    
    
    // ---------- Query selectors ----------
    
    
    // querySelector
    qs(selector, context = document) {
        return context.querySelector(selector)
    }
    
    // querySelectorAll
    qsa(selector, context = document) {
        return context.querySelectorAll(selector)
    }
    
    
    // ---------- Hide/show element (s) ----------
    
    
    // Hide element(s) (add class .hidden)
    hide(element) {
        this.addClass(element, 'hidden');
    }
    
    // Show element(s) (remove class .hidden)
    show(element) {
        this.removeClass(element, 'hidden');
    }
    
    
    // ---------- Work with classes ----------
    
    
    // Add class to element(s)
    // delay - if > 0, add class 'ready' before className, then delay in ms
    addClass(element, className, delay = 0) {
        let item = typeof element == 'string' ? this.qsa(element) : element;
        if (item) {
            if (item instanceof NodeList) {
                if (delay > 0) {
                    item.forEach(i => { i.classList.add('ready') });
                    setTimeout(() => {
                        item.forEach(i => { i.classList.add(className) })
                    }, delay)
                } else {
                    item.forEach(i => {
                        i.classList.add(className)
                    })
                }
            } else {
                if (delay > 0) {
                    item.classList.add('ready');
                    setTimeout(() => { item.classList.add(className) }, delay)
                } else {
                    item.classList.add(className)
                }
            }
        }
    }
    
    // Remove class to element(s)
    // delay - if > 0, remove class 'ready' after className, then delay in ms
    removeClass(element, className, delay = 0) {
        let item = typeof element == 'string' ? this.qsa(element) : element;
        if (item) {
            if (item instanceof NodeList) {
                if (delay > 0) {
                    item.forEach(i => { i.classList.remove(className) })
                    setTimeout(() => {
                        item.forEach(i => { i.classList.remove('ready') });
                    }, delay * 4)
                } else {
                    item.forEach(i => {
                        i.classList.remove(className)
                    })
                }
            } else {
                if (delay > 0) {
                    item.classList.remove(className);
                    setTimeout(() => { item.classList.remove('ready') }, delay * 4)
                } else {
                    item.classList.remove(className)
                }
            }
        }
    }
    
    // Toggle class on element(s)
    toggleClass(element, className, delay = 0) {
        let item = typeof element == 'string' ? this.qsa(element)[0] : element;
        if (item) {
            if (item.classList.contains(className)) {
                this.removeClass(element, className, delay)
            } else {
                this.addClass(element, className, delay)
            }
        }
    }
    
    // Switch class by condition
    // If condition is true -> add className, if false -> remove className
    switchClass(element, condition, className, delay = 0) {
        let item = typeof element == 'string' ? this.qsa(element)[0] : element;
        if (item) {
            if (condition) {
                this.addClass(element, className, delay)
            } else {
                this.removeClass(element, className, delay)
            }
        }
    }
    
    
    // ---------- Page events and URL ----------
    
    
    // Reload page
    reload() {
        location.reload()
    }
    
    // Reload page with new hash
    reloadWithHash(hash) {
        window.location.hash = hash;
        this.reload()
    }
    
    // Redirect to url
    redirectTo(url) {
        window.location = url;
        return false
    }
    
    // Update title and page url without reload
    // You can add only hash: lib.updateURL('#ok').
    updateURL(url, title) {
        if (typeof(history.pushState) != 'undefined') {
            history.pushState(null, title, url)
        } else {
            location.href = url
        }
    }
    
    
    //  ---------- Numbers ----------
    
    
    // Random number
    random(a, b) {
        return Math.floor(Math.random() * (b - a + 1)) + a;
    }
    
    // Price format 9 999 999.99
    price(price) {
        let p = parseFloat(price);
        return p
            .toFixed(2)
            .replace(/\d(?=(\d{3})+\.)/g, '$& ')
            .replace('.00', '')
    }
    
    // Number format
    number(a) {
        return this.numberFormat(a);
    }
    
    numberFormat(a) {
        a = parseFloat(a) + '';
        let x = a.split('.'),
            x1 = x[0],
            x2 = x.length > 1 ? '.' + x[1] : '';
        for (let b = /(\d+)(\d{3})/; b.test(x1);) x1 = x1.replace(b, '$1 $2');
        return x1 + x2;
    }
    
    // Number decline
    numberDecline(a, b, c, d) {
        let e = '';
        if (a > 10 && 1 == parseInt((a % 100) / 10)) {
            e = d;
        } else {
            switch (a % 10) {
                case 1:
                    e = b;
                    break;
                case 2:
                case 3:
                case 4:
                    e = c;
                    break;
                case 5:
                case 6:
                case 7:
                case 8:
                case 9:
                case 0:
                    e = d;
            }
        }
        return e;
    }
    
    
    // ---------- Validate ----------
    
    
    // Email validation
    isEmail(email) {
        let regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        return regex.test(email);
    }
    
    
    // ---------- Utils ----------
    
    
    // Make password with length (default — 8)
    // selector — input or textarea field query selector
    makePassword(length, selector) {
        length = length || 8;
        let password = '',
            upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lower = 'abcdefghijklmnopqrstuvwxyz',
            chars = '!@#^$%^&*()-+:,.;_',
            digits = '0123456789';
            
        for (var i = 0; i < length / 4; ++i) {
            password += upper.charAt(Math.floor(Math.random() * upper.length));
            password += lower.charAt(Math.floor(Math.random() * lower.length));
            password += chars.charAt(Math.floor(Math.random() * chars.length));
            password += digits.charAt(Math.floor(Math.random() * digits.length))
        }
        password = password.substring(0, length);
        password = password.split('').sort(() => {return 0.5-Math.random()}).join('');
        if (selector) {
            this.qs(selector).value = password
        } else {
            return password
        }
    }
    
    // Load script and add it to the end of the body
    // Callback function run after the script loaded.
    // auto.lib.loadScript(
    //   '/path/to/file.js',
    //   () => { Callback function... },
    //   async|defer
    // )
    loadScript(path, callback, type = 'async') {
        if (this.loadedScripts.indexOf(path) == -1) {
            let script = document.createElement('script');
            script.onload = () => {
                if (typeof callback === 'function') {
                    callback();
                }
            };
            script.src = path;
            if (type) script.setAttribute(type, '');
            document.body.appendChild(script);
            this.loadedScripts.push(path);
        } else {
            if (typeof callback === 'function') {
                callback();
            }
        }
    }
    
    // Deffered callback execution
    // auto.lib.deffered(
    //   () => { Code... },
    //   delay in ms
    // )
    deffered(callback, delay = 10000) {
        let fired = false;
        
        function run() {
            if (fired === false) {
                fired = true;
                
                window.removeEventListener('scroll', run, false);
                window.removeEventListener('resize', run, false);
                window.removeEventListener('click', run, false);
                window.removeEventListener('keydown', run, false);
                window.removeEventListener('mousemove', run, false);
                window.removeEventListener('touchmove', run, false);
                
                // Load or set load event
                if (document.readyState == 'complete') {
                    callback();
                } else {
                    window.addEventListener('load', callback, false);
                }
            }
        }
        
        setTimeout(run, delay);
        
        window.addEventListener('scroll', run, { capture: false, passive: true });
        window.addEventListener('resize', run, { capture: false, passive: true });
        window.addEventListener('click', run, { capture: false, passive: true });
        window.addEventListener('keydown', run, { capture: false, passive: true });
        window.addEventListener('mousemove', run, { capture: false, passive: true });
        window.addEventListener('touchmove', run, { capture: false, passive: true });
    }
    
    // Run once on appear
    // The callback is triggered when the object is approaching the viewport
    // selector — trigger element
    // options — IntersectionObserver options
    // Example:
    // auto.lib.appear(
    //   '#map',
    //   () => { Code... },
    //   {
    //       root: window,
    //       rootMargin: '0px 0px 0px 0px',
    //       threshold: 0.5
    //   }
    // )
    onAppear(selector, callback, options) {
        let params = options || {
            rootMargin: '200px 0px',
            threshold: 0
        }
        let element = this.qs(selector);
        let observerCallback = (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    callback();
                    observer.unobserve(element);
                }
            });
        }
        let observer = new IntersectionObserver(observerCallback, params);
        observer.observe(element);
    }
    runOnAppear(selector, callback, options) {
        this.onAppear(selector, callback, options)
    }
    
    
    // ---------- Work with errors ----------
    
    
    // Show alert window with errors
    // data — object (with key:value), array or string (object and array splitted by '\n')
    // return false
    alertErrors(data) {
        if (data) {
            if (
                typeof data === 'string' ||
                data instanceof String
            ) {
                alert(data)
            } else {
                let err = []
                for (let e in data) { err.push(data[e]) }
                alert(err.join('\n'))
            }
        }
    }
    
    // Print text with errors
    // data — object (with key:value), array or string (object and array splitted by '<br/>')
    // return string
    printErrors(data) {
        if (data) {
            if (
                typeof data === 'string' ||
                data instanceof String
            ) {
                return data
            } else {
                let err = [];
                for (let e in data) { err.push(data[e]) }
                return '<div>' + err.join('</div><div>') + '</div>'
            }
        }
    }
}

export const lib = new Lib();
