package io.github.whiteseeker;

import java.util.logging.Logger;
import java.lang.String;

public class FirebaseUtils {

  public static class PnToken {
    private String platform;
    private String token;
    private String topic;
    private int time_offset;
    private String endpoint;

    public PnToken() {
      // empty ctor for firebase to deserialise
    }

    public PnToken(String token, String platform) {
      this.token = token;
      this.platform = platform;
      time_offset = 0;
      topic = "games";
    }

    public String getPlatform() {
      return platform;
    }

    public String getToken() {
      return token;
    }

    public String getTopic() {
      return topic;
    }

    public int getTime_offset() {
      return time_offset;
    }

    public String getEndpoint() {
      return endpoint;
    }

    public String toString() { 
      return "PnToken [" + platform + "] [" + topic + "] [" + token + "]";
    } 
  }
}