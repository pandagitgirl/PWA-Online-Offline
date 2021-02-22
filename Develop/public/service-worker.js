const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/assets/css/style.css",
  "/assets/js/loadPosts.js",
  "/assets/images/Angular-icon.png",
  "/assets/images/React-icon.png",
  "/assets/images/Vue.js-icon.png",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/assets/images/icons/icon-72x72.png",
  "/assets/images/icons/icon-96x96.png",
  "/assets/images/icons/icon-128x128.png",
  "/assets/images/icons/icon-144x144.png",
  "/assets/images/icons/icon-152x152.png",
  "/assets/images/icons/icon-192x192.png",
  "/assets/images/icons/icon-384x384.png",
  "/assets/images/icons/icon-512x512.png",
];

//variables to store the name of our cache

const CACHE_NAME = "static-cache-v2";
const DATA_CACHE_NAME = "data-cache-v1";
console.log(self);

// install event- in this event we can determine waht files we want to cache, inside of ourinstall callback we take a few steps. 1. Open a cache 2. Cache our files. 3. confirm whether all the required assets are cached or not. when theinstall event fires, trigger the callback function.
self.addEventListener("install", function(evt) {
  //the evt.waitUntil method takes a promise and uses it to know long installation takes whether it was successful. if all files caches, the service worker will be installed, if not the installs fails.
  evt.waitUntil(
    //call chaches.open passing in the name of your cache
    caches.open(CACHE_NAME).then(cache => {
      console.log("Your files were pre-cached successfully!");
      //addAll method
      return cache.addAll(FILES_TO_CACHE);
    })
  );


//typically used in theinstall event of service worker, service worker will skip the waiting phaase and becomes activated. 
  self.skipWaiting();
});

//activation step - managing old caches, after activating the service worker will control all the pages that fall under its scope
self.addEventListener("activate", function(evt) {
  evt.waitUntil(
    //returns a promise that resolves to an array of cache keys, returned inthe same order that they were inserted. 
    caches.keys().then(keyList => {
      return Promise.all(
        //mapping over the arrayof cache keys, if the key is not equal to the cache_name and the key is not equal to the data_cache_name, we remove the old cache for that key.
        keyList.map(key => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log("Removing old cache data", key);
            return caches.delete(key);
          }
        })
      );
    })
  );

//when a service worker is initially registered, pages wont use it until the next load event. the claim method causes the pages to be controlled immediately. 
  self.clients.claim();
});

// fetch - service workers can listen for fetch requests, we are going to handle the requests that deal with api data differently than the requests that dont contain /api. if api is in the url.
self.addEventListener("fetch", function(evt) {
  // cache successful requests to the API
  //if the event request url includes /api/ enter this code block.
  if (evt.request.url.includes("/api/")) {
    evt.respondWith(
      //we open our cache, run a fetch based on whatver reques comes in. attempts to fetch the resource. 
      caches.open(DATA_CACHE_NAME).then(cache => {
        return fetch(evt.request)
          .then(response => {
            //we end up in .then if its able to fetch the resource. 
            // If the response was good, clone it and store it in the cache.
            if (response.status === 200) {
              ///takes the data and puts it in this data cache, store a copy of that data, necessary so later onif we are offline we can still access 
              cache.put(evt.request.url, response.clone());
            }
            //return the response, outputs the response. what if we are offline?

            return response;
          })
          //if we are offline, we end up in the .catch. do we already have this resource in the cache?
          .catch(err => {
            // Network request failed, try to get it from the cache.
            return cache.match(evt.request);
          });
      }).catch(err => console.log(err))
    );

    return;
  }
  //everything else besides /api if going to static cache. we only go to this code if the request that camein did not include /api. requesting a static file. 

  // if the request is not for the API, serve static assets using "offline-first" approach.
  // see https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook#cache-falling-back-to-network
  evt.respondWith(
    //open our cache
    caches.match(evt.request).then(function(response) {
      //is there a matching file in our cache? if we have the resource it will output the copy from cache. if there is not acopy in cacje, call fetch. attempts to find on the server. offline first approach. html, images,css resources. first looks to cache even if we are offline, will only try to load from server as a last resort. will speed things up for us. 
      return response || fetch(evt.request);
    })
  );
});

