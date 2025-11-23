const SibApiV3Sdk = require("sib-api-v3-sdk");
const defaultClient = SibApiV3Sdk.ApiClient.instance;

// Configure API key authorization
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Validate environment configuration
const validateEmailConfig = () => {
  if (!process.env.BREVO_API_KEY) {
    console.error(
      "❌ BREVO_API_KEY is not configured in environment variables"
    );
    return false;
  }

  if (!process.env.DEFAULT_SENDER_EMAIL) {
    console.warn("⚠️ DEFAULT_SENDER_EMAIL not set, using default");
  }

  return true;
};

/**
 * Send email using Brevo with enhanced error handling
 */
const sendEmail = async (options) => {
  try {
    // Validate configuration
    if (!validateEmailConfig()) {
      throw new Error("Email service configuration is incomplete");
    }

    console.log("📧 Attempting to send email to:", options.to);
    console.log("📝 Email subject:", options.subject);

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.htmlContent;
    sendSmtpEmail.textContent = options.textContent;
    sendSmtpEmail.sender = {
      name: options.senderName || "Diga Darshan App",
      email:
        options.senderEmail ||
        process.env.DEFAULT_SENDER_EMAIL ||
        "digadarshangroup@gmail.com",
    };
    sendSmtpEmail.to = [{ email: options.to }];
    sendSmtpEmail.replyTo = {
      email:
        options.senderEmail ||
        process.env.REPLY_TO_EMAIL ||
        "digadarshangroup@gmail.com",
      name: options.senderName || "Diga Darshan Support",
    };

    console.log("🔄 Sending email via Brevo...");
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("✅ Email sent successfully. Message ID:", data.messageId);
    return {
      success: true,
      messageId: data.messageId,
      message: "Email sent successfully",
    };
  } catch (error) {
    console.error("❌ Error sending email:", error);

    // Enhanced error messages based on common Brevo errors
    let errorMessage = "Failed to send email";

    if (error.response && error.response.body) {
      const brevoError = error.response.body;
      console.error("📋 Brevo error details:", brevoError);

      if (brevoError.code === "unauthorized") {
        errorMessage =
          "Email service authentication failed. Please check API key.";
      } else if (brevoError.code === "invalid_parameter") {
        errorMessage =
          "Invalid email parameters. Please check recipient email.";
      } else {
        errorMessage = brevoError.message || "Email service error";
      }
    } else if (error.code === "ENOTFOUND") {
      errorMessage = "Network error: Cannot connect to email service.";
    }

    throw new Error(errorMessage);
  }
};

/**
 * Send farmer welcome email (No credentials included) - KEEP THIS AS IS
 */
const sendFarmerWelcomeEmail = async (farmerEmail, farmerName, phone) => {
  try {
    console.log(
      `👨‍🌾 Preparing welcome email for: ${farmerName} (${farmerEmail})`
    );

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(farmerEmail)) {
      throw new Error(`Invalid email format: ${farmerEmail}`);
    }

    const subject = "Welcome to Diga Darshan App!";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #007AFF, #0056CC);
            color: white; 
            padding: 40px 20px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .content { 
            padding: 40px 30px; 
          }
          .welcome-section {
            text-align: center;
            margin-bottom: 30px;
          }
          .welcome-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .features-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
            margin: 30px 0;
          }
          .feature-item {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007AFF;
          }
          .feature-icon {
            font-size: 24px;
            color: #007AFF;
            flex-shrink: 0;
          }
          .feature-content h4 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 16px;
          }
          .feature-content p {
            margin: 0;
            color: #666;
            font-size: 14px;
            line-height: 1.5;
          }
          .next-steps {
            background: #e8f4ff;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
          }
          .next-steps h3 {
            color: #007AFF;
            margin-top: 0;
          }
          .contact-info {
            background: #fff3cd;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 25px 0;
          }
          .footer { 
            text-align: center; 
            padding: 30px 20px; 
            color: #666; 
            font-size: 12px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
          }
          .highlight {
            color: #007AFF;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐟 Diga Darshan App</h1>
            <p>Your Partner in Aquaculture Success</p>
          </div>
          
          <div class="content">
            <div class="welcome-section">
              <div class="welcome-icon">🎉</div>
              <h2>Welcome to the Diga Darshan Family, ${farmerName}!</h2>
              <p>We're thrilled to have you onboard. Your journey towards successful aquaculture management starts now!</p>
            </div>

            <div class="features-grid">
              <div class="feature-item">
                <div class="feature-icon">📱</div>
                <div class="feature-content">
                  <h4>Easy Farm Management</h4>
                  <p>Track your fish growth, monitor water quality, and manage feeding schedules all from your mobile device.</p>
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">📊</div>
                <div class="feature-content">
                  <h4>Smart Analytics</h4>
                  <p>Get insights into your farm's performance with detailed reports and growth analytics.</p>
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">🤝</div>
                <div class="feature-content">
                  <h4>Expert Support</h4>
                  <p>Connect with our aquaculture experts for guidance and best practices.</p>
                </div>
              </div>
            </div>

            <div class="next-steps">
              <h3>What's Next?</h3>
              <p>Our sales representative will contact you shortly to help you get started with the app and provide your login details.</p>
              <p>You'll receive a separate communication with instructions on how to access your account and begin using our platform.</p>
            </div>

            <div class="contact-info">
              <h4>Need Immediate Assistance?</h4>
              <p>Our support team is here to help you every step of the way.</p>
              <p>📞 <strong>Customer Care:</strong> 1800-123-4567</p>
              <p>📧 <strong>Email:</strong> support@digadarshan.com</p>
            </div>

            <p style="text-align: center; color: #666; margin-top: 30px;">
              Thank you for choosing Diga Darshan. We look forward to being part of your aquaculture success story!
            </p>

            <p style="text-align: center;">
              <strong>Best regards,<br>The Diga Darshan Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Diga Darshan App. All rights reserved.</p>
            <p>Diga Darshan Group | Transforming Aquaculture Through Technology</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Welcome to Diga Darshan App!
      
      Dear ${farmerName},
      
      We're thrilled to welcome you to the Diga Darshan family! Your journey towards 
      successful aquaculture management starts now.
      
      ABOUT DIGA DARSHAN:
      - Easy Farm Management: Track fish growth and monitor water quality
      - Smart Analytics: Get insights into your farm's performance
      - Expert Support: Connect with aquaculture experts
      
      WHAT'S NEXT?
      Our sales representative will contact you shortly to help you get started 
      with the app and provide your login details.
      
      You'll receive a separate communication with instructions on how to access 
      your account and begin using our platform.
      
      NEED IMMEDIATE ASSISTANCE?
      Our support team is here to help you every step of the way.
      
      Customer Care: 1800-123-4567
      Email: support@digadarshan.com
      
      Thank you for choosing Diga Darshan. We look forward to being part of 
      your aquaculture success story!
      
      Best regards,
      The Diga Darshan Team
      
      ---
      This is an automated message. Please do not reply to this email.
      © ${new Date().getFullYear()} Diga Darshan App. All rights reserved.
      Diga Darshan Group | Transforming Aquaculture Through Technology
    `;

    const result = await sendEmail({
      to: farmerEmail,
      subject,
      htmlContent,
      textContent,
      senderName: "Diga Darshan Team",
      senderEmail: "digadarshangroup@gmail.com",
    });

    console.log(`✅ Welcome email sent successfully to ${farmerEmail}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${farmerEmail}:`, error);
    throw error;
  }
};

/**
 * NEW: Send payment status update email to farmer
 */
const sendPaymentStatusEmail = async (
  farmerEmail,
  farmerName,
  paymentTitle,
  status,
  notes,
  amount
) => {
  try {
    console.log(
      `💰 Preparing payment status email for: ${farmerName} (${farmerEmail})`
    );

    const subject = `Payment Status Update: ${paymentTitle}`;

    const statusMessages = {
      Completed: "has been approved and completed",
      Processing: "is being processed",
      Failed: "has failed",
      Cancelled: "has been cancelled",
      Pending: "is pending review",
    };

    const statusMessage = statusMessages[status] || "status has been updated";

    const statusColors = {
      Completed: "#10b981",
      Processing: "#3b82f6",
      Failed: "#ef4444",
      Cancelled: "#6b7280",
      Pending: "#f59e0b",
    };

    const statusColor = statusColors[status] || "#6b7280";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8f9fa;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #007AFF, #0056CC);
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .content { 
            padding: 30px; 
          }
          .payment-card {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
          }
          .amount {
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            color: #007AFF;
            margin: 15px 0;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin: 10px 0;
          }
          .notes-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border-left: 4px solid #007AFF;
          }
          .cta-button {
            display: inline-block;
            background: #007AFF;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer { 
            text-align: center; 
            padding: 25px; 
            color: #666; 
            font-size: 12px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐟 Diga Darshan App</h1>
            <p>Payment Status Update</p>
          </div>
          
          <div class="content">
            <h2>Hello ${farmerName},</h2>
            <p>We wanted to update you on the status of your payment. Your payment for <strong>"${paymentTitle}"</strong> ${statusMessage}.</p>
            
            <div class="payment-card">
              <h3 style="margin-top: 0; color: #333;">Payment Details</h3>
              
              <div class="amount">₹${amount}</div>
              
              <div class="status-badge" style="background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}40;">
                Status: ${status}
              </div>
              
              ${
                notes
                  ? `
                <div class="notes-box">
                  <strong>📝 Verification Notes:</strong>
                  <p style="margin: 8px 0 0 0; color: #666;">${notes}</p>
                </div>
              `
                  : ""
              }
              
              <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 6px;">
                <p style="margin: 0; color: #0369a1; font-size: 14px;">
                  <strong>💡 Next Steps:</strong> 
                  ${
                    status === "Completed"
                      ? "Your payment has been verified. The work will proceed as scheduled."
                      : status === "Processing"
                      ? "We are reviewing your payment submission. You will be notified once verified."
                      : status === "Failed"
                      ? "Please contact our support team for assistance with this payment."
                      : "Please check your dashboard for any required actions."
                  }
                </p>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${
                process.env.FRONTEND_URL || "https://yourapp.com"
              }/dashboard" class="cta-button">
                View Dashboard
              </a>
            </div>
            
            <p style="color: #666; margin-top: 25px;">
              If you have any questions about this payment or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>📞 Support Contact:</strong><br>
                Phone: 1800-123-4567<br>
                Email: support@digadarshan.com
              </p>
            </div>
            
            <p style="text-align: center;">
              <strong>Best regards,<br>The Diga Darshan Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Diga Darshan App. All rights reserved.</p>
            <p>Diga Darshan Group | Transforming Aquaculture Through Technology</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Diga Darshan App - Payment Status Update
      
      Hello ${farmerName},
      
      Your payment for "${paymentTitle}" ${statusMessage}.
      
      PAYMENT DETAILS:
      Amount: ₹${amount}
      Status: ${status}
      ${notes ? `Notes: ${notes}` : ""}
      
      NEXT STEPS:
      ${
        status === "Completed"
          ? "Your payment has been verified. The work will proceed as scheduled."
          : status === "Processing"
          ? "We are reviewing your payment submission. You will be notified once verified."
          : status === "Failed"
          ? "Please contact our support team for assistance with this payment."
          : "Please check your dashboard for any required actions."
      }
      
      View your dashboard: ${
        process.env.FRONTEND_URL || "https://yourapp.com"
      }/dashboard
      
      If you have questions, contact our support team:
      Phone: 1800-123-4567
      Email: support@digadarshan.com
      
      Best regards,
      The Diga Darshan Team
      
      ---
      This is an automated message. Please do not reply to this email.
      © ${new Date().getFullYear()} Diga Darshan App. All rights reserved.
      Diga Darshan Group | Transforming Aquaculture Through Technology
    `;

    const result = await sendEmail({
      to: farmerEmail,
      subject,
      htmlContent,
      textContent,
      senderName: "Diga Darshan Payments",
      senderEmail: "payments@digadarshan.com",
    });

    console.log(`✅ Payment status email sent to ${farmerEmail}`);
    return result;
  } catch (error) {
    console.error(
      `❌ Failed to send payment status email to ${farmerEmail}:`,
      error
    );
    throw error;
  }
};

/**
 * Send account credentials email (separate from welcome email)
 */
const sendAccountCredentialsEmail = async (
  farmerEmail,
  farmerName,
  phone,
  temporaryPassword
) => {
  try {
    console.log(
      `🔐 Preparing credentials email for: ${farmerName} (${farmerEmail})`
    );

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(farmerEmail)) {
      throw new Error(`Invalid email format: ${farmerEmail}`);
    }

    const subject = "Your Diga Darshan App Login Details";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: #007AFF; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f8f9fa; }
          .credentials { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #007AFF; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .password-box { background: #f8f9fa; padding: 10px; border-radius: 4px; border: 1px solid #dee2e6; font-family: monospace; font-size: 16px; text-align: center; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐟 Diga Darshan App</h1>
            <p>Your Account Login Details</p>
          </div>
          <div class="content">
            <h2>Hello ${farmerName},</h2>
            <p>As promised, here are your login credentials for the Diga Darshan App:</p>
            
            <div class="credentials">
              <h3 style="color: #007AFF; margin-top: 0;">🔐 Login Details</h3>
              <p><strong>👤 Username/Phone:</strong> ${phone}</p>
              <p><strong>🔑 Temporary Password:</strong></p>
              <div class="password-box">
                <strong>${temporaryPassword}</strong>
              </div>
            </div>
            
            <div class="warning">
              <h4 style="color: #856404; margin-top: 0;">⚠️ Important Security Notice</h4>
              <p>For your security, please change your password immediately after your first login.</p>
            </div>
            
            <h3>🚀 Getting Started:</h3>
            <ol>
              <li><strong>Download</strong> the Diga Darshan Farmer App from your app store</li>
              <li><strong>Login</strong> using your phone number and the temporary password above</li>
              <li><strong>Change your password</strong> in the app settings for security</li>
              <li><strong>Explore features</strong> and start managing your farm</li>
            </ol>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Best regards,<br><strong>Diga Darshan Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Diga Darshan App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Diga Darshan App - Login Details
      
      Hello ${farmerName},
      
      As promised, here are your login credentials for the Diga Darshan App:
      
      LOGIN DETAILS:
      Username/Phone: ${phone}
      Temporary Password: ${temporaryPassword}
      
      IMPORTANT SECURITY NOTICE:
      Please change your password immediately after first login for security.
      
      GETTING STARTED:
      1. Download the Diga Darshan Farmer App
      2. Login using your phone number and temporary password
      3. Change your password in app settings
      4. Explore features and start managing your farm
      
      If you have questions, contact our support team.
      
      Best regards,
      Diga Darshan Team
      
      This is an automated message. Please do not reply to this email.
      © ${new Date().getFullYear()} Diga Darshan App. All rights reserved.
    `;

    const result = await sendEmail({
      to: farmerEmail,
      subject,
      htmlContent,
      textContent,
      senderName: "Diga Darshan Support",
      senderEmail: "digadarshangroup@gmail.com",
    });

    console.log(`✅ Credentials email sent successfully to ${farmerEmail}`);
    return result;
  } catch (error) {
    console.error(
      `❌ Failed to send credentials email to ${farmerEmail}:`,
      error
    );
    throw error;
  }
};

/**
 * Test email service configuration
 */
const testEmailService = async () => {
  try {
    console.log("🧪 Testing email service configuration...");

    if (!validateEmailConfig()) {
      return { success: false, message: "Email service not configured" };
    }

    // Try to send a test email to verify configuration
    const testResult = await sendEmail({
      to: "test@example.com",
      subject: "Diga Darshan App - Email Service Test",
      htmlContent: "<p>This is a test email from Diga Darshan App.</p>",
      textContent: "This is a test email from Diga Darshan App.",
    });

    console.log("✅ Email service test completed successfully");
    return { success: true, message: "Email service is working correctly" };
  } catch (error) {
    console.error("❌ Email service test failed:", error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendEmail,
  sendFarmerWelcomeEmail,
  sendPaymentStatusEmail, // NEW: Added payment status email
  sendAccountCredentialsEmail,
  testEmailService,
  validateEmailConfig,
};
