import { useState, useEffect } from "react";
import axios from "axios";
import Logger from "./logger.ts";

interface Notification {
  ID: string;
  Type: "Placement" | "Result" | "Event";
  Message: string;
  Timestamp: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<"all" | "priority">("priority");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [topLimit, setTopLimit] = useState<number>(10);

  const [formType, setFormType] = useState<"Placement" | "Result" | "Event">("Placement");
  const [formMessage, setFormMessage] = useState<string>("");

  const FETCH_ALL_NOTIFICATIONS = () => {
    axios.get("http://localhost:5000/api/notifications")
      .then((res) => {
        setNotifications(res.data.notifications);
        Logger.info("Successfully fetched all notifications");
      })
      .catch((err) => {
        Logger.error("Failed to fetch all notifications", err);
      });
  };

  const FETCH_PRIORITY_NOTIFICATIONS = (limit: number) => {
    axios.get(`http://localhost:5000/api/notifications/priority?limit=${limit}`)
      .then((res) => {
        setNotifications(res.data.notifications);
        Logger.info(`Successfully fetched top ${limit} priority notifications`);
      })
      .catch((err) => {
        Logger.error("Failed to fetch priority notifications", err);
      });
  };

  useEffect(() => {
    if (currentPage === "all") {
      FETCH_ALL_NOTIFICATIONS();
    } else {
      FETCH_PRIORITY_NOTIFICATIONS(topLimit);
    }
  }, [currentPage, topLimit]);

  const HANDLE_CLICK_CARD = (id: string) => {
    axios.post(`http://localhost:5000/api/notifications/${id}/read`)
      .then(() => {
        Logger.info(`Notification ${id} marked as read`);
        if (currentPage === "all") {
          FETCH_ALL_NOTIFICATIONS();
        } else {
          FETCH_PRIORITY_NOTIFICATIONS(topLimit);
        }
      })
      .catch((err) => {
        Logger.error(`Failed to mark notification ${id} as read`, err);
      });
  };

  const HANDLE_SUBMIT_NOTIFICATION = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMessage.trim()) return;

    axios.post("http://localhost:5000/api/notifications", {
      type: formType,
      message: formMessage
    })
      .then(() => {
        setFormMessage("");
        Logger.info(`Successfully triggered new ${formType} notification`);
        if (currentPage === "all") {
          FETCH_ALL_NOTIFICATIONS();
        } else {
          FETCH_PRIORITY_NOTIFICATIONS(topLimit);
        }
      })
      .catch((err) => {
        Logger.error("Failed to trigger notification", err);
      });
  };

  const FILTERED_ALL = notifications.filter(item => {
    if (typeFilter === "All") return true;
    return item.Type === typeFilter;
  });

  return (
    <div className="dashboard">
      <header>
        <h1 id="app-title">
          <span>🔔</span> Campus Notifier
        </h1>
        <div className="nav-tabs" role="tablist">
          <button
            id="tab-priority"
            className={`tab-btn ${currentPage === "priority" ? "active" : ""}`}
            onClick={() => setCurrentPage("priority")}
          >
            Priority Inbox
          </button>
          <button
            id="tab-all"
            className={`tab-btn ${currentPage === "all" ? "active" : ""}`}
            onClick={() => setCurrentPage("all")}
          >
            All Notifications
          </button>
        </div>
      </header>

      {currentPage === "priority" && (
        <section aria-labelledby="priority-heading">
          <div className="controls-row">
            <h2 id="priority-heading" style={{ fontSize: "1.25rem", fontWeight: 600 }}>
              Top Unread Priority
            </h2>
            <div className="limit-wrapper">
              <label htmlFor="limit-input">Show Top:</label>
              <input
                id="limit-input"
                className="input-limit"
                type="number"
                min="1"
                max="50"
                value={topLimit}
                onChange={(e) => setTopLimit(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="empty-state">🎉 All caught up! No unread notifications.</p>
          ) : (
            <div className="notifications-list">
              {notifications.map((item) => (
                <div
                  key={item.ID}
                  id={`notif-card-${item.ID}`}
                  className="card placement"
                  onClick={() => HANDLE_CLICK_CARD(item.ID)}
                >
                  <div className="card-header">
                    <span className={`badge ${item.Type.toLowerCase()}`}>{item.Type}</span>
                    <span className="timestamp">{item.Timestamp}</span>
                  </div>
                  <p className="message">{item.Message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {currentPage === "all" && (
        <section aria-labelledby="all-heading">
          <div className="controls-row">
            <h2 id="all-heading" style={{ fontSize: "1.25rem", fontWeight: 600 }}>
              All Notifications
            </h2>
            <select
              id="filter-type"
              className="select-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Placement">Placement</option>
              <option value="Result">Result</option>
              <option value="Event">Event</option>
            </select>
          </div>

          {FILTERED_ALL.length === 0 ? (
            <p className="empty-state">No notifications found.</p>
          ) : (
            <div className="notifications-list">
              {FILTERED_ALL.map((item) => (
                <div
                  key={item.ID}
                  id={`notif-card-${item.ID}`}
                  className={`card ${item.Type.toLowerCase()}`}
                  onClick={() => HANDLE_CLICK_CARD(item.ID)}
                >
                  <div className="card-header">
                    <span className={`badge ${item.Type.toLowerCase()}`}>{item.Type}</span>
                    <span className="timestamp">{item.Timestamp}</span>
                  </div>
                  <p className="message">{item.Message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="trigger-section" aria-labelledby="trigger-heading">
        <h2 id="trigger-heading" className="trigger-title">Trigger Live Notification</h2>
        <form id="notification-form" className="trigger-form" onSubmit={HANDLE_SUBMIT_NOTIFICATION}>
          <select
            id="form-select-type"
            className="select-filter"
            value={formType}
            onChange={(e) => setFormType(e.target.value as any)}
          >
            <option value="Placement">Placement (Critical)</option>
            <option value="Result">Result (High)</option>
            <option value="Event">Event (Normal)</option>
          </select>

          <input
            id="form-input-message"
            className="input-field"
            type="text"
            placeholder="Type notification message here..."
            value={formMessage}
            onChange={(e) => setFormMessage(e.target.value)}
            required
          />

          <button id="form-submit-btn" className="btn-submit" type="submit">
            Trigger
          </button>
        </form>
      </section>
    </div>
  );
}
