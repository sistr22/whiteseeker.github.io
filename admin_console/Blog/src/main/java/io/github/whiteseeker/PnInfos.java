package io.github.whiteseeker;

import java.util.logging.Logger;
import java.lang.String;

public class PnInfos {
  private String title;
  private String body;
  private String url;

  public PnInfos() {
    // empty ctor for firebase to deserialise
  }

  public PnInfos(String title, String body, String url) {
    this.title = title;
    this.body = body;
    this.url = url;
  }

  public String getTitle() {
    return title;
  }

  public String getBody() {
    return body;
  }

  public String getUrl() {
    return url;
  }

  public String toString() { 
    return "Title: '" + title + "', Body: '" + body + "', url: '" + url + "'";
  } 
}