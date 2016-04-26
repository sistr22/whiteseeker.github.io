package io.github.whiteseeker;

import java.util.logging.Logger;
import com.google.appengine.api.taskqueue.Queue;
import com.google.appengine.api.taskqueue.QueueFactory;
import com.google.appengine.api.taskqueue.TaskOptions;

import java.io.IOException;
import java.util.Properties;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.RequestDispatcher;
import javax.servlet.ServletException;

public class PushServlet extends HttpServlet {
  private static final Logger log = Logger.getLogger(PushServlet.class.getName());

  @Override
  public void doGet(final HttpServletRequest req, final HttpServletResponse resp) {
    if (req.getParameter("pn_title") != null && req.getParameter("pn_body") != null && req.getParameter("pn_url") != null) {

      final PnInfos newPnInfos = new PnInfos((String)req.getParameter("pn_title"), (String) req.getParameter("pn_body"), (String) req.getParameter("pn_url"));
      
      String isTest = "1";
      if(req.getParameter("is_test") != null)
        isTest = "1";
      else
        isTest = "0";

      String pushToken = null;
      if(req.getParameter("pn_token") != null)
        pushToken = req.getParameter("pn_token");

      // Add the task to the default queue.
      Queue queue = QueueFactory.getDefaultQueue();
      TaskOptions taskOpt = TaskOptions.Builder.withUrl("/pushworker")
        .param("pn_title", newPnInfos.getTitle())
        .param("pn_body", newPnInfos.getBody())
        .param("pn_url", newPnInfos.getUrl())
        .param("is_test", isTest);
      if(req.getParameter("pn_token") != null)
        taskOpt.param("pn_token", req.getParameter("pn_token"));
      queue.add(taskOpt);

      req.setAttribute("pn_title", newPnInfos.getTitle());
      req.setAttribute("pn_body", newPnInfos.getBody());
      req.setAttribute("pn_url", newPnInfos.getUrl());
      try {
        RequestDispatcher dispatcher = req.getRequestDispatcher("/push_result.jsp");
        dispatcher.forward(req,  resp);
      } catch(ServletException e) {
        log.warning("ServletException" + e.getMessage());
      } catch(IOException e) {
        log.warning("IOException" + e.getMessage());
      }
      
    } else {
      //UserService userService = UserServiceFactory.getUserService();
      //User currentUser = userService.getCurrentUser();

      resp.setContentType("text/plain");

      try {
        resp.getWriter().println("Missing required fields");
      } catch(IOException e) {
        log.warning("IOException" + e.getMessage());
      }
    }
  }

  private void SendPush() {
    log.info("->SendPush()");
    log.info("<-SendPush");
  }
}