"""
Rule-based IT support suggestion engine.
Generates structured troubleshooting advice based on ticket category,
affected module, and keywords — no external API required.
"""

from __future__ import annotations


def generate_suggestion(ticket) -> str:
    category    = (ticket.category        or "other").lower()
    module      = (ticket.affected_module or "").lower()
    subject     = (ticket.subject         or "").lower()
    description = (ticket.description     or "").lower()
    text        = subject + " " + description

    cause, fixes, persist = _get_blocks(category, module, text)

    return (
        f"LIKELY CAUSE\n{'─' * 40}\n{cause}\n\n"
        f"QUICK FIXES  (try in order)\n{'─' * 40}\n{fixes}\n\n"
        f"IF IT PERSISTS\n{'─' * 40}\n{persist}"
    )


# ── helpers ───────────────────────────────────────────────────────────────────

def _bullet(items: list[str]) -> str:
    return "\n".join(f"• {i}" for i in items)


def _generic_persist() -> str:
    return _bullet([
        "Take a screenshot of the error and include it in a follow-up comment.",
        "Note the exact time the issue occurred.",
        "Tell IT which browser and device you are using.",
        "IT will investigate server logs and database records.",
    ])


def _generic_fixes() -> str:
    return _bullet([
        "Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard-refresh the page.",
        "Clear your browser cache: Settings → Privacy → Clear browsing data.",
        "Try a different browser (Chrome, Edge, Firefox).",
        "Log out and log back in — your session may have expired.",
        "Check your internet connection.",
    ])


def _get_blocks(category: str, module: str, text: str) -> tuple[str, str, str]:
    # ── Login / Password ──────────────────────────────────────────────────────
    if category == "login_problem" or "login" in module or "password" in module:
        cause = "Incorrect credentials, an expired or locked account, or a browser session issue."
        fixes = _bullet([
            "Double-check your username/email — make sure Caps Lock is OFF.",
            "Click 'Forgot Password' on the login page to reset your password.",
            "Clear browser cookies and cache, then try again.",
            "Try opening the ERP in a private/incognito window.",
            "If you see 'Account locked', wait 15 minutes then try again.",
            "Contact your admin to verify your account is active and not locked.",
        ])
        persist = _bullet([
            "Ask your admin to check your account status in User Management.",
            "Ask admin to use 'Reset Password' on your user profile.",
            "Share any error message shown on the login screen.",
        ])
        return cause, fixes, persist

    # ── Account / Permission ──────────────────────────────────────────────────
    if category in ("account_issue", "access_request", "permission_issue"):
        cause = "Your account role may not have the required permissions for the action you're trying to perform."
        fixes = _bullet([
            "Log out and log back in — permissions may have just been updated.",
            "Check if you are on the correct farm (look at the farm selector in the bottom-left).",
            "Ask your admin if your role was recently changed.",
            "If requesting new access, specify exactly which module/action you need.",
        ])
        persist = _bullet([
            "Admin should open User Management → find your account → check Role and Status.",
            "Admin can adjust role permissions under User Management → Roles.",
            "Provide the exact button or page where access is denied.",
        ])
        return cause, fixes, persist

    # ── Button Not Working ────────────────────────────────────────────────────
    if category == "button_not_working" or any(k in text for k in ("button", "click", "not respond", "not working")):
        cause = "A JavaScript error, stale browser session, or a required field not filled in is preventing the action."
        fixes = _bullet([
            "Check that all required fields (*) on the form are filled in.",
            "Hard-refresh the page: Ctrl+Shift+R.",
            "Open browser DevTools (F12) → Console tab — look for red error messages and include them in your ticket.",
            "Log out and log back in, then try again.",
            "Try the same action in a different browser.",
        ])
        persist = _bullet([
            "Copy and paste any red error messages from the browser console (F12).",
            "Record a short screen video showing what happens when you click.",
            "IT will check the server logs for the exact time of the action.",
        ])
        return cause, fixes, persist

    # ── Data Not Saving ───────────────────────────────────────────────────────
    if category == "data_not_saving" or any(k in text for k in ("not save", "not saving", "lost", "disappear")):
        cause = "A required field may be missing, a duplicate record exists, or there was a network timeout while saving."
        fixes = _bullet([
            "Make sure all required fields (marked with *) are filled in.",
            "Check for any red error message that appears after clicking Save.",
            "Check your internet connection — try loading another page first.",
            "If editing an existing record, check that no one else modified it simultaneously.",
            "Try saving again after a hard-refresh (Ctrl+Shift+R).",
        ])
        persist = _bullet([
            "Note the exact page and form where data is not saving.",
            "Copy any error message shown in red after clicking Save.",
            "IT will check the database and server error logs.",
        ])
        return cause, fixes, persist

    # ── Calculation Issue ─────────────────────────────────────────────────────
    if category == "calculation_issue" or any(k in text for k in ("wrong", "incorrect", "calculation", "total", "amount", "wrong number")):
        cause = "The calculation may use data from linked records (batch counts, feed costs, mortality) that are incomplete or recently changed."
        fixes = _bullet([
            "Refresh the page — the dashboard and reports pull live data.",
            "Check that all source data is entered correctly (e.g. batch initial count, feed prices, mortality records).",
            "For FCR: make sure feed issues AND daily weight logs are recorded.",
            "For financial totals: check if any sales orders are in 'cancelled' status — they are excluded.",
            "For mortality rate: verify all mortality records are linked to the correct batch.",
        ])
        persist = _bullet([
            "Share a screenshot of the incorrect value and what you expected it to be.",
            "Tell IT which batch, date range, or farm the calculation is for.",
            "IT will trace the underlying data used in the formula.",
        ])
        return cause, fixes, persist

    # ── Inventory ─────────────────────────────────────────────────────────────
    if category == "inventory_issue" or "inventory" in module:
        cause = "Stock levels may not reflect recent purchases/issues, or a reserved quantity is reducing available stock."
        fixes = _bullet([
            "Refresh the Inventory page — quantities update in real time.",
            "Check if there are pending Purchase Orders that haven't been received yet.",
            "Check the 'Reserved' column — some stock may be reserved for a batch.",
            "Verify that feed issues were saved against the correct feed type.",
            "If an item is missing, check that the correct category filter is selected.",
        ])
        persist = _bullet([
            "Note the item name and the quantity you expected vs what is shown.",
            "IT will check movement history and any recent purchase/issue transactions.",
        ])
        return cause, fixes, persist

    # ── Feed Management ───────────────────────────────────────────────────────
    if category in ("feed_issue",) or "feed" in module:
        cause = "Feed stock or FCR values depend on purchases, issues, and daily logs all being recorded correctly."
        fixes = _bullet([
            "Confirm feed purchases are saved with correct cost per kg.",
            "Confirm feed issues are linked to the correct batch.",
            "Check that daily logs include avg weight for FCR to calculate.",
            "Refresh the Feed Management page.",
        ])
        persist = _bullet([
            "Share the batch number and date range with incorrect feed data.",
            "IT will review feed purchase and issue records linked to that batch.",
        ])
        return cause, fixes, persist

    # ── Procurement ───────────────────────────────────────────────────────────
    if category == "procurement_issue" or "procurement" in module:
        cause = "A purchase order may be pending approval, or the order status hasn't been updated after receiving goods."
        fixes = _bullet([
            "Check the PO status — it may be 'Pending Approval'.",
            "If approved, confirm the order was marked as 'Received' to update inventory.",
            "Verify the supplier and item details are correct.",
            "Refresh the Procurement page.",
            "If you need approval, ask your admin to review the PO.",
        ])
        persist = _bullet([
            "Share the PO number and what action is blocked.",
            "IT will check approval workflow and PO status in the database.",
        ])
        return cause, fixes, persist

    # ── Sales ─────────────────────────────────────────────────────────────────
    if category == "sales_issue" or "sales" in module:
        cause = "A sales order may be pending approval, have a validation error, or reference an incorrect batch/buyer."
        fixes = _bullet([
            "Check the order status — 'Pending' orders need admin approval.",
            "Verify the batch, quantity, and price per kg are correctly entered.",
            "Confirm the buyer name is selected from the existing buyer list.",
            "Check if the batch is in 'Harvest Soon' or 'Harvested' status.",
            "Refresh the Sales & Procurement page.",
        ])
        persist = _bullet([
            "Share the order number and the specific error or problem.",
            "IT will verify the batch status and sales order records.",
        ])
        return cause, fixes, persist

    # ── Reports ───────────────────────────────────────────────────────────────
    if category == "report_issue" or "report" in module:
        cause = "Report data depends on all underlying records (batches, feed, mortality, sales) being complete and correctly linked."
        fixes = _bullet([
            "Check that the correct farm and date range are selected in the filters.",
            "Refresh the Reports page.",
            "If a chart is empty, verify there is data for the selected period.",
            "Clear browser cache (Ctrl+Shift+R) — old cached data may be showing.",
            "Check that active batches have daily logs with avg weight recorded (needed for FCR/weight reports).",
        ])
        persist = _bullet([
            "Specify which report, which farm, and which date range is showing incorrect data.",
            "IT will verify the underlying batch, feed, and mortality data.",
        ])
        return cause, fixes, persist

    # ── Dashboard ─────────────────────────────────────────────────────────────
    if category == "dashboard_issue" or "dashboard" in module:
        cause = "Dashboard KPIs load live data — a slow connection, no active batches, or missing records can cause empty or incorrect values."
        fixes = _bullet([
            "Make sure a farm is selected in the bottom-left farm selector.",
            "Refresh the page (Ctrl+Shift+R).",
            "Check that at least one batch is in 'Active' or 'Harvest Soon' status.",
            "Check your internet connection.",
        ])
        persist = _bullet([
            "Note which specific KPI or chart is wrong/empty.",
            "IT will check whether the farm has active batches and data in the database.",
        ])
        return cause, fixes, persist

    # ── System Error ─────────────────────────────────────────────────────────
    if category == "system_error" or any(k in text for k in ("error", "crash", "500", "failed", "something went wrong")):
        cause = "A server-side error or network issue caused the request to fail. This could be a temporary problem or a bug."
        fixes = _bullet([
            "Refresh the page and try the action again.",
            "Log out and log back in.",
            "Hard-refresh: Ctrl+Shift+R.",
            "Wait 2–3 minutes and try again — the server may have been restarting.",
            "Try in a different browser or private window.",
        ])
        persist = _bullet([
            "Open browser DevTools (F12) → Network tab → find the failed request → copy the response body.",
            "Note the exact time and what action triggered the error.",
            "IT will check server error logs (Render logs) for that timestamp.",
        ])
        return cause, fixes, persist

    # ── Feature Request ───────────────────────────────────────────────────────
    if category == "feature_request":
        cause = "This is a feature request — no troubleshooting needed."
        fixes = _bullet([
            "No action required on your end.",
            "IT/Admin will review the request and assess feasibility.",
            "You may add more details in the comments to help clarify the requirement.",
        ])
        persist = _bullet([
            "Describe the specific workflow or problem the feature would solve.",
            "Mention how often you need this and how many users it would benefit.",
        ])
        return cause, fixes, persist

    # ── Mortality / Batch ─────────────────────────────────────────────────────
    if "mortality" in module or "batch" in module:
        cause = "Mortality or batch data may be linked to the wrong house/date, or the batch status may prevent the action."
        fixes = _bullet([
            "Confirm the correct batch and house are selected.",
            "Check that the record date is within the batch's active period.",
            "Refresh the page and try again.",
            "Verify the batch status is 'Active' or 'Harvest Soon' (not Harvested/Terminated).",
        ])
        persist = _bullet([
            "Share the batch number and the specific action that failed.",
            "IT will check the batch status and mortality records in the database.",
        ])
        return cause, fixes, persist

    # ── Default / Other ───────────────────────────────────────────────────────
    cause = "The root cause is unclear from the description — it may be a browser issue, a data entry error, or a system bug."
    fixes = _generic_fixes()
    persist = _generic_persist()
    return cause, fixes, persist
