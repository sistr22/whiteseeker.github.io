package io.github.whiteseeker;

import com.google.api.client.util.Key;
import java.lang.String;
import java.util.List;

public class GcmUtils {

  public static class SendResponse {

    @Key("success")
    public int success;

    @Key("failure")
    public int failure;

    @Key("results")
    public List<PushResult> results;

  }

  public static class PushResult {

    @Key("message_id")
    public String message_id;

    @Key("error")
    public String error;

  }
}