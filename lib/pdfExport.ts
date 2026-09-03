import type { AnalysisHistoryEntry } from "@/types";
import { formatTimestamp, formatCoordinates } from "./utils";

/**
 * PDF Export functionality using browser's built-in print API
 * Creates a formatted incident report that can be printed to PDF
 */

export function exportIncidentToPDF(incident: AnalysisHistoryEntry): void {
  const { result, timestamp, incidentId, latitude, longitude, status, assignedTeam } = incident;
  
  // Create a new window for the PDF content
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) {
    alert("Please allow pop-ups to export PDF reports");
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Incident Report - ${incidentId}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1e40af;
            font-size: 28px;
            margin: 0;
            font-weight: 900;
        }
        .header h2 {
            color: #64748b;
            font-size: 18px;
            margin: 10px 0 0 0;
            font-weight: 400;
        }
        .incident-id {
            background: #eff6ff;
            border: 2px solid #2563eb;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .incident-id strong {
            color: #1e40af;
            font-size: 18px;
            font-family: 'Courier New', monospace;
        }
        .section {
            margin-bottom: 25px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
        }
        .section h3 {
            color: #1e40af;
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .info-item {
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        .info-item .label {
            font-weight: 600;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .info-item .value {
            font-size: 16px;
            color: #1e293b;
            font-weight: 500;
        }
        .severity-high, .severity-critical {
            color: #dc2626 !important;
            font-weight: 700;
        }
        .severity-medium {
            color: #ea580c !important;
            font-weight: 600;
        }
        .severity-low {
            color: #16a34a !important;
            font-weight: 500;
        }
        .image-section {
            text-align: center;
            margin: 25px 0;
        }
        .incident-image {
            max-width: 100%;
            max-height: 300px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .list-section ul {
            padding-left: 0;
            list-style: none;
        }
        .list-section li {
            background: white;
            margin-bottom: 8px;
            padding: 12px 15px;
            border-radius: 6px;
            border-left: 3px solid #10b981;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .hazard-item {
            border-left-color: #f59e0b !important;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
        }
        @media print {
            body { margin: 0; padding: 20px; }
            .section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>AeroRescueAi</h1>
        <h2>Emergency Incident Report</h2>
    </div>

    <div class="incident-id">
        <div class="label">INCIDENT ID</div>
        <strong>${incidentId || "N/A"}</strong>
    </div>

    <div class="section">
        <h3>Incident Overview</h3>
        <div class="info-grid">
            <div class="info-item">
                <div class="label">Date & Time</div>
                <div class="value">${formatTimestamp(timestamp)}</div>
            </div>
            <div class="info-item">
                <div class="label">Disaster Type</div>
                <div class="value">${result.disasterType}</div>
            </div>
            <div class="info-item">
                <div class="label">People Detected</div>
                <div class="value">${result.peopleDetected} ${result.peopleDetected === 1 ? 'person' : 'people'}</div>
            </div>
            <div class="info-item">
                <div class="label">Urgent Cases</div>
                <div class="value">${result.urgentPeople} ${result.urgentPeople === 1 ? 'person' : 'people'}</div>
            </div>
        </div>
    </div>

    ${incident.imageThumbnail ? `
    <div class="section">
        <h3>Incident Photo</h3>
        <div class="image-section">
            <img src="${incident.imageThumbnail}" alt="Incident scene" class="incident-image" />
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h3>Severity Assessment</h3>
        <div class="info-grid">
            <div class="info-item">
                <div class="label">Flood Severity</div>
                <div class="value severity-${result.floodSeverity.toLowerCase()}">${result.floodSeverity}</div>
            </div>
            <div class="info-item">
                <div class="label">Rescue Priority</div>
                <div class="value severity-${result.rescuePriority.toLowerCase()}">${result.rescuePriority}</div>
            </div>
        </div>
        <div class="info-item" style="margin-top: 15px;">
            <div class="label">Water Condition</div>
            <div class="value">${result.waterCondition}</div>
        </div>
    </div>

    <div class="section">
        <h3>Situation Summary</h3>
        <div class="info-item">
            <div class="value">${result.summary}</div>
        </div>
    </div>

    ${result.recommendations.length > 0 ? `
    <div class="section list-section">
        <h3>Recommended Actions</h3>
        <ul>
            ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${result.hazards.length > 0 ? `
    <div class="section list-section">
        <h3>Hazards Detected</h3>
        <ul>
            ${result.hazards.map(hazard => `
                <li class="hazard-item">
                    <strong>${hazard.name}</strong> (${hazard.severity}) - ${hazard.description}
                </li>
            `).join('')}
        </ul>
    </div>
    ` : ''}

    ${latitude !== undefined && longitude !== undefined ? `
    <div class="section">
        <h3>Location Information</h3>
        <div class="info-item">
            <div class="label">GPS Coordinates</div>
            <div class="value">${formatCoordinates(latitude, longitude)}</div>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h3>Rescue Operations</h3>
        <div class="info-grid">
            <div class="info-item">
                <div class="label">Incident Status</div>
                <div class="value">${status || 'NEW'}</div>
            </div>
            <div class="info-item">
                <div class="label">Assigned Team</div>
                <div class="value">${assignedTeam || 'Not assigned'}</div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>This report was generated by AeroRescueAi Emergency Response System</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then trigger print dialog
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
}