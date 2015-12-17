importScripts('https://cdn.firebase.com/js/client/2.3.2/firebase.js');

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

    event.waitUntil(  
      self.registration.showNotification(title, {  
        body: body,  
        icon: icon,  
        tag: tag
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