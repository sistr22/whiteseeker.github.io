<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ page import="java.util.List" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>

<html>
<head>
  <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
  <link rel="stylesheet" href="https://code.getmdl.io/1.1.3/material.indigo-pink.min.css">
  <script defer src="https://code.getmdl.io/1.1.3/material.min.js"></script>
</head>

<body>

    <section class="section--center mdl-grid mdl-grid--no-spacing mdl-shadow--2dp" style="margin-top: 18px; margin-bottom: 18px">
      <div class="mdl-card mdl-cell mdl-cell--12-col">
        <div class="mdl-card__supporting-text">
          <h4>Push notification</h4>
          <div style="float: left;margin-top: 10px;">
            <form id="pn_parameters" style="float: left;margin: 0 auto;" action="/push" method="get">
              <div class="formField">Title <input type="text" name="pn_title" value="New blog post!" required/></div>
              <div class="formField">Body <input type="text" name="pn_body" value="Check out that new game !" required/></div>
              <div class="formField">Url <input type="text" name="pn_url" value="https://whiteseeker.github.io/" required/></div>
              <div class="formField"><input type="checkbox" name="is_test" value="1" checked="checked"> Test</div>
              <div class="formField">Pn token <input type="text" name="pn_token" value="..." /></div>
              <div class="formField"><input type="submit" value="Send push" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect"/></div>
            </form>
          </div>
        </div>
      </div>
    </section>

</body>
</html>