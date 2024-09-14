//
//	lib.js
//	x
//
//	Created by Andrey Shpigunov on 11.09.2024.
//
//  Library
//
//  qs(selector, context = document)
//  qsa(selector, context = document)
//  qse(element, context = document)
//  hide(element)
//  show(element)
//  addClass(element, className, delay = 0)
//  removeClass(element, className, delay = 0)
//  toggleClass(element, className, delay = 0)
//  switchClass(element, condition, className, delay = 0)
//  reload()
//  reloadWithHash(hash)
//  redirectTo(url)
//  updateURL(url, title)
//  random(a, b)
//  price(price)
//  number(num)
//  numberDecline(number, nominative, genitiveSingular, genetivePlural)
//  isEmail(email)
//  makePassword(length, selector)
//  loadScript(path, callback, type = 'async')
//  deffered(callback, delay = 10000)
//  onAppear(selector, callback, options)
//  alertErrors(data)
//  printErrors(data)
//


class Lib {
    
    constructor() {
        this.loadedScripts = []
    }
    
    
    // ---------- Query selectors ----------
    
    
    // querySelector -> return element
    qs(selector, context = document) {
        if (typeof selector == 'string') {
            return context.querySelector(selector)
        } else {
            return selector instanceof NodeList ? selector[0] : selector
        }
    }
    
    // querySelectorAll -> return NodeList or Array of elements
    qsa(selector, context = document) {
        if (typeof selector == 'string') {
            return context.querySelectorAll(selector)
        } else {
            if (selector instanceof NodeList) {
                return selector
            } else {
                // Check is Array to prevent nesting
                return Array.isArray(selector) ? selector : [selector]
            }
        }
    }
    
    
    // ---------- Hide/show element (s) ----------
    
    
    // Hide element(s) (add class .hidden)
    hide(selector) {
        this.addClass(selector, 'hidden')
    }
    
    // Show element(s) (remove class .hidden)
    show(selector) {
        this.removeClass(selector, 'hidden')
    }
    
    
    // ---------- Work with classes ----------
    
    
    // Add class to element(s)
    // delay - if > 0, add class 'className_ready' before className, then delay in ms
    async addClass(selector, className, delay = 0) {
        let items = this.qsa(selector);
        if (items.length) {
            if (delay > 0) {
                for (let i of items) i.classList.add(className + '_ready');
                await new Promise(resolve =>  {
                    setTimeout(() => {
                        for (let i of items) i.classList.add(className);
                        resolve()
                    }, delay);
                })
            } else {
                for (let i of items) i.classList.add(className);
            }
        }
        return
    }
    
    // Remove class to element(s)
    // delay - if > 0, remove class 'className_ready' after className, then delay in ms
    async removeClass(selector, className, delay = 0) {
        let items = this.qsa(selector);
        if (items.length) {
            if (delay > 0) {
                for (let i of items) i.classList.remove(className);
                await new Promise(resolve =>  {
                    setTimeout(() => {
                        for (let i of items) i.classList.remove(className + '_ready');
                        resolve()
                    }, delay);
                })
            } else {
                for (let i of items) i.classList.remove(className);
            }
        }
        return
    }
    
    // Toggle class on element(s)
    async toggleClass(selector, className, delay = 0) {
        let items = this.qsa(selector);
        if (items.length) {
            for (let i of items) {
                if (i.classList.contains(className)) {
                    await this.removeClass(i, className, delay)
                } else {
                    await this.addClass(i, className, delay)
                }
            }
        }
        return
    }
    
    // Switch class by condition
    // If condition is true -> add className, if false -> remove className
    async switchClass(selector, condition, className, delay = 0) {
        let items = this.qsa(selector);
        if (items.length) {
            for (let i of items) {
                if (condition) {
                    await this.addClass(i, className, delay)
                } else {
                    await this.removeClass(i, className, delay)
                }
            }
        }
        return
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
        return Math.floor(Math.random() * (b - a + 1)) + a
    }
    
    // Price format
    // 10 -> 10
    // 1000 -> 1 000
    // 100000 -> 100 000
    // 10.00 -> 10
    // 10.5 -> 10.50
    // 10.55 -> 10.55
    // 10.555 -> 10.56
    price(price) {
        let p = parseFloat(price);
        p = p.toFixed(2);
        p = p.replace(/\d(?=(\d{3})+\.)/g, '$& ');
        p = p.replace('.00', '');
        return p
    }
    
    // Number format
    // 10 -> 10
    // 1000 -> 1 000
    // 100000 -> 100 000
    // 10.00 -> 10
    // 10.5 -> 10.5
    // 10.50 -> 10.5
    // 10.55 -> 10.55
    // 10.555 -> 10.555
    number(num) {
        num = parseFloat(num) + '';
        let x = num.split('.'),
            x1 = x[0],
            x2 = x.length > 1 ? '.' + x[1] : '';
        for (let b = /(\d+)(\d{3})/; b.test(x1);) x1 = x1.replace(b, '$1 $2');
        return x1 + x2
    }
    
    // Number decline
    numberDecline(number, nominative, genitiveSingular, genetivePlural) {
        let text = '';
        if (number > 10 && 1 == parseInt((number % 100) / 10)) {
            text = genetivePlural
        } else {
            switch (number % 10) {
                case 1:
                    text = nominative;
                    break;
                case 2:
                case 3:
                case 4:
                    text = genitiveSingular;
                    break;
                case 5:
                case 6:
                case 7:
                case 8:
                case 9:
                case 0:
                    text = genetivePlural
            }
        }
        return text
    }
    
    
    // ---------- Validate ----------
    
    
    // Email validation
    isEmail(email) {
        let regexp = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        return regexp.test(email)
    }
    
    // JSON validator
    isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (err) {
            return false;
        }
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
    // lib.loadScript(
    //   '/path/to/file.js',
    //   () => { Callback code },
    //   async|defer
    // )
    loadScript(path, callback, type = 'async') {
        if (this.loadedScripts.indexOf(path) == -1) {
            let script = document.createElement('script');
            script.onload = () => callback();
            script.src = path;
            if (type) script.setAttribute(type, '');
            document.body.appendChild(script);
            this.loadedScripts.push(path)
        } else {
            callback()
        }
    }
    
    // Deffered callback execution
    // lib.deffered(
    //   () => { Callback code },
    //   delay in ms
    // )
    deffered(callback, delay = 10000) {
        const events = ['scroll','resize','click','keydown','mousemove','touchmove'];
        let fired = false;
        let timer;
        
        function run() {
            if (!fired) {
                for (let e of events) {
                    window.removeEventListener(e, run, false)
                }
                // Load or set load event
                if (document.readyState == 'complete') {
                    callback()
                } else {
                    window.addEventListener('load', callback, false)
                }
                clearTimeout(timer);
                fired = true
            }
        }
        for (let e of events) {
            window.addEventListener(e, run, {
                capture: false,
                once: true,
                passive: true
            })
        }
        timer = setTimeout(run, delay);
    }
    
    // Run callback(e) once on element appear in viewport
    // selector — trigger element(s)
    // callback — callback function on element appeared
    // options — IntersectionObserver options
    // lib.onAppear('.loading', e => { Code... })
    onAppear(selector, callback, options) {
        let elements = this.qsa(selector);
        if (elements.length) {
            let params = {
                root: null,
                rootMargin: '200px',
                threshold: 0,
                ...options
            }
            let observerCallback = (entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        callback(entry.target);
                        observer.unobserve(entry.target)
                    }
                })
            }
            let observer = new IntersectionObserver(observerCallback, params);
            for (let el of elements) observer.observe(el)
        }
    }
    
    
    // ---------- Work with errors ----------
    
    
    // Show alert window with errors
    // data — object (with key:value), array or string (object and array splitted by '\n')
    alertErrors(data) {
        if (data) {
            if (
                typeof data === 'string' ||
                data instanceof String
            ) {
                alert(data)
            } else {
                let err = [];
                for (let e in data) err.push(data[e]);
                alert(err.join('\n'))
            }
        }
    }
    
    // Return errors as text, each error in it's own <div>
    // data — object (with key:value), array or string (object and array splitted by '<br/>')
    printErrors(data) { // -> string
        if (data) {
            if (
                typeof data === 'string' ||
                data instanceof String
            ) {
                return `<div>${data}</div>`
            } else {
                let err = [];
                for (let e in data) err.push(`<div class="error_${e}">${data[e]}</div>`);
                return err.join('\n')
            }
        }
    }
}

export const lib = new Lib();
