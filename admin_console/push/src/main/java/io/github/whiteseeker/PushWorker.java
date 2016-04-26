package io.github.whiteseeker;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.ProtocolException;
import java.net.URL;
import java.util.logging.Logger;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.ServletException;

import com.firebase.client.Firebase;
import com.firebase.client.DataSnapshot;
import com.firebase.client.ValueEventListener;
import com.firebase.client.FirebaseError;
import com.firebase.client.AuthData;

import com.google.api.client.json.JsonParser; 
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.json.JsonToken;

import java.util.List;
import java.util.ArrayList;

public class PushWorker extends HttpServlet {
  private static final Logger log = Logger.getLogger(PushServlet.class.getName());

  protected void doPost(HttpServletRequest req, HttpServletResponse response)
      throws ServletException, IOException {
    if (req.getParameter("pn_title") != null && req.getParameter("pn_body") != null && req.getParameter("pn_url") != null && req.getParameter("is_test") != null) {
      final PnInfos pn = new PnInfos(req.getParameter("pn_title"), req.getParameter("pn_body"), req.getParameter("pn_url"));
      log.info("Preparing pn: " + pn);
      final boolean isTest = req.getParameter("is_test").equals("1")?true:false;
      if(isTest)
        log.info("It's a test");
      else
        log.info("It's NOT a test");

      final String opt_pn_token = req.getParameter("pn_token");

      final Firebase firebase = new Firebase("https://"+ Constants.FIREBASE_ID +".firebaseio.com");
      firebase.authWithCustomToken(Constants.FIREBASE_SECRET, new Firebase.AuthResultHandler() {
          @Override
          public void onAuthenticationError(FirebaseError error) {
            log.warning("Login to Firebase Failed! " + error.getMessage());
          }
          @Override
          public void onAuthenticated(AuthData authData) {
            log.info("Login to Firebase Succeeded!");
            
            Firebase fbPnInfos = firebase.child("pninfos");
            
            fbPnInfos.setValue(pn, new Firebase.CompletionListener() {
              @Override
              public void onComplete(FirebaseError firebaseError, Firebase fi) {
                if (firebaseError != null) {
                  log.warning("Data could not be saved. " + firebaseError.getMessage());
                } else {
                  log.info("Data saved successfully -> " + pn);

                  //SendPush();
                  final ArrayList<FirebaseUtils.PnToken> tokens = new ArrayList<>();
                  if(isTest) {
                    if(opt_pn_token != null) {
                      tokens.add(new FirebaseUtils.PnToken(opt_pn_token, "chrome"));
                      // Get firebase push tokens to test but ignore the result
                      getFirebasePushTokens(new FirebaseTokenListener() {
                        public void onComplete(List<FirebaseUtils.PnToken> fbTokens) {
                          log.info("Push token received from firebase, but we ignore them (test push)");
                          sendPush(tokens);
                        }
                        public void onFail() {
                          log.warning("Fail to get the push tokens from Firebase");
                        }
                      });
                    } else {
                      log.warning("Test push and no token specified -_-, nothing to do !");
                    }
                  } else {
                    // Get the token from the firebase DB
                    getFirebasePushTokens(new FirebaseTokenListener() {
                      public void onComplete(List<FirebaseUtils.PnToken> fbTokens) {
                        log.info("Push token received from firebase");
                        tokens.addAll(fbTokens);
                        sendPush(tokens);
                      }
                      public void onFail() {
                        log.warning("Fail to get the push tokens from Firebase");
                      }
                    });
                  }
                }
              }
            });
          }
      });


    } else {
      log.info("Missing parameters to start the task");
    }
  }

  private void deleteToken(FirebaseUtils.PnToken token) {
    log.info("Deleting: " + token);
    final Firebase firebase = new Firebase("https://"+ Constants.FIREBASE_ID +".firebaseio.com/pntokens/" + token.getToken());
    firebase.removeValue();
  }

  private static interface FirebaseTokenListener {
    public void onComplete(List<FirebaseUtils.PnToken> tokens);
    public void onFail();
  }

  private List<String> getFirebasePushTokens(final FirebaseTokenListener listener) {
    log.info("Getting push tokens from Firebase");
    final Firebase firebase = new Firebase("https://"+ Constants.FIREBASE_ID +".firebaseio.com/pntokens/");

    firebase.addListenerForSingleValueEvent(new ValueEventListener() {
      @Override
      public void onDataChange(DataSnapshot snapshot) {
        log.info("There are " + snapshot.getChildrenCount() + " push tokens");
        List<FirebaseUtils.PnToken> tokens = new ArrayList<>();
        for (DataSnapshot postSnapshot: snapshot.getChildren()) {
          FirebaseUtils.PnToken token = postSnapshot.getValue(FirebaseUtils.PnToken.class);
          log.info("Token: " + token.getPlatform());
          tokens.add(token);
        }
        if(listener != null) {
          listener.onComplete(tokens);
        }
      }
      @Override
      public void onCancelled(FirebaseError firebaseError) {
        if(listener != null)
          listener.onFail();
      }
    });
    return null;
  }

  private void sendPush(List<FirebaseUtils.PnToken> tokens) {
    // ====================================================================
    // Make a POST http request to gcm server to send the push

    try {
      URL url = new URL("https://android.googleapis.com/gcm/send");
      HttpURLConnection connection = (HttpURLConnection) url.openConnection();
      connection.setRequestProperty("Content-Type", "application/json");
      connection.setRequestProperty("Authorization", "key=" + Constants.GCM_KEY);

      connection.setDoOutput(true);
      connection.setRequestMethod("POST");

      // Prepare the body (jsonStrByte) of the POST http request
      String jsonStr = "{\"registration_ids\":[";
      for( int i = 0 ; i < tokens.size() ; i++) {
        FirebaseUtils.PnToken token = tokens.get(i);
        if(token.getPlatform().equals("chrome")) {
          if(i != 0)
              jsonStr += ",";

          jsonStr += ("\"" + token.getToken() + "\"");
        }
      }
      jsonStr += "]}";

      log.info("jsonStr: " + jsonStr);

      OutputStreamWriter writer = new OutputStreamWriter(connection.getOutputStream());
      writer.write(jsonStr);
      writer.close();

      if (connection.getResponseCode() == HttpURLConnection.HTTP_OK) {
        // OK
        log.info("Request to GCM server successful");
        BufferedReader br = new BufferedReader(new InputStreamReader((connection.getInputStream())));
        StringBuilder sb = new StringBuilder();
        String output;
        while ((output = br.readLine()) != null)
          sb.append(output);
        String responseBody = sb.toString();
        log.info("Response body: " + responseBody);
        // ====================================================================
        // Check the bodyresp to see if any push has failed. Clean the db if so

        JsonParser parser = JacksonFactory.getDefaultInstance().createJsonParser(responseBody);

        GcmUtils.SendResponse gcmResponse = parser.parse(GcmUtils.SendResponse.class);
        log.info("Success: " + gcmResponse.success);
        

        if(gcmResponse.failure > 0) {
          log.info("Failure: " + gcmResponse.failure);
          for(int i = 0 ; i < gcmResponse.results.size() ; i++) {
            GcmUtils.PushResult result = gcmResponse.results.get(i);
            if(result.error != null) {
              log.info("Error with push[" + i + "]");
              deleteToken(tokens.get(i));
            }
          }
        }

        // ====================================================================
      } else {
        // Server returned HTTP error code.
        log.warning("Error while making request to GCM server: " + connection.getResponseCode());
      }

    } catch(MalformedURLException e) {
      log.warning("MalformedURLException: " + e.getMessage());
    } catch(IOException e) {
      log.warning("IOException: " + e.getMessage());
    }
  }
}