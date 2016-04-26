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
          <% if ((String)request.getAttribute("is_test") != null && ((String)request.getAttribute("is_test")).equals("0")) { %>
          <h4>Push sent:</h4>
          <% } else if ((String)request.getAttribute("is_test") != null && ((String)request.getAttribute("is_test")).equals("1")) { %>
          <h4>Test push nothing was send:</h4>
          <% } %>
          
          <div style="float: left;margin-top: 10px;">
              <div>Title ${pn_title}</div>
              <div>Body ${pn_body}</div>
          </div>
        </div>
      </div>
    </section>

</body>
</html>