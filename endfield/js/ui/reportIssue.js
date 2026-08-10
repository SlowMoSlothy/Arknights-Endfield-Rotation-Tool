const REPORT_DESCRIPTION_MIN_LENGTH = 20;
const REPORT_DESCRIPTION_MAX_LENGTH = 2000;
const REPORT_ADDITIONAL_MAX_LENGTH = 1500;

const reportIssueState = {
    submitting: false
};

function getReportOperatorContext(team = selectedTeam, operatorList = operators) {
    if (!Array.isArray(team) || !Array.isArray(operatorList)) {
        return { ids: [], names: [] };
    }

    const selectedOperators = team
        .filter(operatorId => operatorId !== null && operatorId !== undefined)
        .map(operatorId => operatorList.find(operator => String(operator?.id) === String(operatorId)))
        .filter(Boolean)
        .slice(0, 4);

    return {
        ids: selectedOperators.map(operator => Number(operator.id)).filter(Number.isFinite),
        names: selectedOperators.map(operator => String(operator.name || "").trim()).filter(Boolean)
    };
}

function buildIssueReportPayload({
    reportType,
    description,
    additionalInformation = "",
    pageUrl = window.location.href,
    operatorContext = getReportOperatorContext()
}) {
    return {
        game: "arknights_endfield",
        report_type: String(reportType || "other"),
        description: String(description || "").trim().slice(0, REPORT_DESCRIPTION_MAX_LENGTH),
        additional_information: String(additionalInformation || "").trim().slice(0, REPORT_ADDITIONAL_MAX_LENGTH),
        page_url: String(pageUrl || "").slice(0, 1000),
        team_operator_ids: operatorContext.ids,
        team_operator_names: operatorContext.names
    };
}

function getReportSupabaseClient() {
    return typeof supabaseClient !== "undefined" ? supabaseClient : null;
}

function setReportIssueStatus(text, className = "") {
    const status = document.getElementById("reportIssueStatus");
    if (!status) return;

    status.className = `my-rotations-status${className ? ` ${className}` : ""}`;
    status.textContent = text;
}

function updateReportIssueContextPreview() {
    const preview = document.getElementById("reportIssueContextPreview");
    if (!preview) return;

    const { names } = getReportOperatorContext();
    preview.textContent = names.length ? names.join(", ") : "Current page · No team selected";
}

function openReportIssueModal() {
    const modal = document.getElementById("reportIssueModal");
    const form = document.getElementById("reportIssueForm");
    if (!modal || !form) return;

    form.reset();
    setReportIssueStatus("");
    updateReportIssueContextPreview();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    window.setTimeout(() => document.getElementById("reportIssueDescriptionInput")?.focus(), 0);
}

function closeReportIssueModal() {
    if (reportIssueState.submitting) return;

    const modal = document.getElementById("reportIssueModal");
    if (!modal) return;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
}

async function submitReportIssue(event) {
    event.preventDefault();
    if (reportIssueState.submitting) return;

    const client = getReportSupabaseClient();
    const submitButton = document.getElementById("submitReportIssueBtn");
    const payload = buildIssueReportPayload({
        reportType: document.getElementById("reportIssueTypeInput")?.value,
        description: document.getElementById("reportIssueDescriptionInput")?.value,
        additionalInformation: document.getElementById("reportIssueAdditionalInput")?.value
    });

    if (payload.description.length < REPORT_DESCRIPTION_MIN_LENGTH) {
        setReportIssueStatus(`Please enter at least ${REPORT_DESCRIPTION_MIN_LENGTH} characters.`, "is-error");
        return;
    }

    if (!client) {
        setReportIssueStatus("Reports are temporarily unavailable. Please try again later.", "is-error");
        return;
    }

    reportIssueState.submitting = true;
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
    }
    setReportIssueStatus("Sending anonymous report...");

    try {
        const { error } = await client.from("issue_reports").insert(payload);
        if (error) throw error;

        setReportIssueStatus("Thank you. Your report was sent anonymously.", "is-success");
        document.getElementById("reportIssueForm")?.reset();
        window.setTimeout(closeReportIssueModal, 1100);
    } catch (error) {
        console.error("Issue report submission failed:", error);
        setReportIssueStatus(
            "The report could not be sent. Please try again later.",
            "is-error"
        );
    } finally {
        reportIssueState.submitting = false;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Send report";
        }
    }
}

function initReportIssue() {
    const openButton = document.getElementById("reportIssueBtn");
    const closeButton = document.getElementById("closeReportIssueModalBtn");
    const cancelButton = document.getElementById("cancelReportIssueBtn");
    const form = document.getElementById("reportIssueForm");
    const modal = document.getElementById("reportIssueModal");

    if (openButton) openButton.addEventListener("click", openReportIssueModal);
    if (closeButton) closeButton.addEventListener("click", closeReportIssueModal);
    if (cancelButton) cancelButton.addEventListener("click", closeReportIssueModal);
    if (form) form.addEventListener("submit", submitReportIssue);
    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeReportIssueModal();
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeReportIssueModal();
    });
}

window.buildIssueReportPayload = buildIssueReportPayload;
window.openReportIssueModal = openReportIssueModal;
window.closeReportIssueModal = closeReportIssueModal;
window.initReportIssue = initReportIssue;
