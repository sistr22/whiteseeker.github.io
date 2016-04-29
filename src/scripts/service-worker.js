importScripts('https://cdn.firebase.com/js/client/2.3.2/firebase.js');

var CACHE_NAME = 'my-site-cache-v1';
var CACHE_DYN = 'blog-dynamique-cache-v1';

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}

var notifurl = "/"
self.addEventListener('push', function(event) {  
  console.log('Received a push message', event);

  // Get a database reference to our notification
  var ref = new Firebase("https://luminous-inferno-9971.firebaseio.com/pninfos");
  // Attach an asynchronous callback to read the data at our posts reference
  ref.on("value", function(snapshot) {
    console.log(snapshot.val());
    var notif = snapshot.val();

    var title = "New post!";
    if(notif.title)
      title = notif.title;

    var body = "Curious ? Check that out (^_^)";
    if(notif.body)
      body = notif.body;

    var icon = '/assets/images/icon_192_192.png';
    if(notif.iconurl)
      icon = notif.iconurl;

    if(notif.url) {
      console.log("notif.url=" + notif.url);
      notifurl = notif.url;
    } else
      notifurl = "/";
 
    var tag = 'simple-push-demo-notification-tag';

    /*event.waitUntil(
      caches.open(CACHE_NAME).then(function(cache) {
        return fetch(notifurl).then(function(response) {
          cache.put(notifurl, response.clone());
          return response.json();
        });
      }).then(function(emails) {
        self.registration.showNotification(title, {  
          body: body,  
          icon: icon,  
          tag: tag,
          requireInteraction: true
        })
      })
    );*/

    event.waitUntil(  
      self.registration.showNotification(title, {  
        body: body,  
        icon: icon,  
        tag: tag,
        requireInteraction: true
      })  
    );  

  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
});

self.addEventListener('notificationclick', function(event) {
  console.log('On notification click: ', event.notification.tag);  
  // Android doesn't close the notification when you click on it  
  // See: http://crbug.com/463146  
  event.notification.close();

  console.log("notifurl=" + notifurl);

  // This looks to see if the current is already open and  
  // focuses if it is  
  event.waitUntil(
    clients.matchAll({  
      type: "window"  
    })
    .then(function(clientList) {  
      for (var i = 0; i < clientList.length; i++) {  
        var client = clientList[i];  
        if (client.url == notifurl && 'focus' in client)  
          return client.focus();  
      }  
      if (clients.openWindow) {
        return clients.openWindow(notifurl);  
      }
    })
  );
});

var urlsToCache = [
  '/css/critical.min.css',
  '/css/merged.min.css',
  '/css/photoswipe/photoswipe-ui-default.min.js',
  '/css/photoswipe/photoswipe.min.js',
  '/scripts/material.min.js',
  '/scripts/modernizr-custom.min.js',
  '/assets/images/favicon.png',
  '/assets/images/icon_192_192.png'
];

self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        //console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  // Parse the URL:
  var requestURL = new URL(event.request.url);

  // Routing for local URLs
  if (requestURL.origin == location.origin) {
    // Handle article URLs
    if (/\.gif$\//.test(requestURL.pathname)) {
      event.respondWith(
        caches.match(event.request).then(function(response) {
          return response || fetch(event.request);
        })
      );
      return;
    }

    if(requestURL.pathname.endsWith(".png.webp") && !requestURL.pathname.endsWith("_small.png.webp")) {
      event.respondWith(
        fetch(event.request).then(function(response) {
          if (!response.ok) {
            console.log('FAIL fetching .png.webp, throwing error');
            // An HTTP error response code (40x, 50x) won't cause the fetch() promise to reject.
            // We need to explicitly throw an exception to trigger the catch() clause.
            throw Error('response status ' + response.status);
          }
          console.log('Success fetching .png.webp');
          // If we got back a non-error HTTP response, return it to the page.
          return response;
        }).catch(function(err) {
          console.log('Fail fetching .png.webp, try using _small.png.web: ' + err);
          // In case of error, return cache
          var myRequest = new Request(event.request.url.replace(".png.webp", "_small.png.webp"));
          return caches.match(myRequest);
        })
      );
      return;
    }

    // Default pattern
    event.respondWith(
      caches.open(CACHE_DYN).then(function(cache) {
        return cache.match(event.request).then(function (response) {
          return response || fetch(event.request).then(function(response) {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
  }
});