interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ResendResponse {
  id: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'AgentWorks <hello@agentworks.dev>';

  if (!resendApiKey) {
    console.log('Email not sent (RESEND_API_KEY not configured):', options.subject);
    return { success: false, error: 'Email not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend error:', error);
      return { success: false, error };
    }

    const data = await response.json() as ResendResponse;
    return { success: true, id: data.id };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: String(err) };
  }
}

export const emailTemplates = {
  waitlistWelcome: (data: { email: string; position: number; referralCode: string }) => ({
    subject: "You're on the AgentWorks Waitlist! 🚀",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AgentWorks</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td style="padding: 40px; background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1)); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 24px 0; text-align: center;">
                Welcome to AgentWorks! 🎉
              </h1>
              
              <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                You're officially on the waitlist for AgentWorks - the Kanban for AI Development.
              </p>
              
              <div style="background: rgba(99,102,241,0.2); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                <p style="color: #a0a0b0; font-size: 14px; margin: 0 0 8px 0;">Your position</p>
                <p style="color: #ffffff; font-size: 48px; font-weight: bold; margin: 0;">#${data.position}</p>
              </div>
              
              <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0;">
                Move up the waitlist!
              </h2>
              
              <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Share your unique referral link and unlock rewards:
              </p>
              
              <div style="background: #1a1a24; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                <code style="color: #6366f1; font-size: 14px; word-break: break-all;">
                  https://agentworks.dev/waitlist?ref=${data.referralCode}
                </code>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 8px; background: #1a1a24; border-radius: 8px; margin-bottom: 8px;">
                    <span style="color: #6366f1;">⚡</span>
                    <span style="color: #a0a0b0; font-size: 14px;"> 3 referrals = Jump 100 spots</span>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 8px; background: #1a1a24; border-radius: 8px;">
                    <span style="color: #eab308;">⭐</span>
                    <span style="color: #a0a0b0; font-size: 14px;"> 5 referrals = Guaranteed beta access</span>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 8px; background: #1a1a24; border-radius: 8px;">
                    <span style="color: #ec4899;">🎁</span>
                    <span style="color: #a0a0b0; font-size: 14px;"> 10 referrals = 20% off lifetime deal</span>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 8px; background: #1a1a24; border-radius: 8px;">
                    <span style="color: #f59e0b;">👑</span>
                    <span style="color: #a0a0b0; font-size: 14px;"> 25 referrals = FREE lifetime Pro</span>
                  </td>
                </tr>
              </table>
              
              <p style="color: #606070; font-size: 14px; text-align: center; margin: 24px 0 0 0;">
                We'll keep you updated on our progress. No spam, ever.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="color: #606070; font-size: 12px; margin: 0;">
                AgentWorks • 11 AI Agents, One Blueprint, Zero Chaos
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `Welcome to AgentWorks!

You're #${data.position} on the waitlist for AgentWorks - the Kanban for AI Development.

Move up the waitlist by sharing your referral link:
https://agentworks.dev/waitlist?ref=${data.referralCode}

Referral rewards:
- 3 referrals = Jump 100 spots
- 5 referrals = Guaranteed beta access
- 10 referrals = 20% off lifetime deal
- 25 referrals = FREE lifetime Pro

We'll keep you updated on our progress. No spam, ever.

AgentWorks - 11 AI Agents, One Blueprint, Zero Chaos`,
  }),

  affiliateApproved: (data: { name: string; code: string }) => ({
    subject: "You're Approved as an AgentWorks Affiliate! 🎉",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td style="padding: 40px; background: linear-gradient(135deg, rgba(34,197,94,0.1), rgba(99,102,241,0.1)); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 24px 0; text-align: center;">
                Congratulations, ${data.name}! 🎉
              </h1>
              
              <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                You've been approved as an AgentWorks affiliate. Start earning commissions today!
              </p>
              
              <div style="background: rgba(34,197,94,0.2); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                <p style="color: #a0a0b0; font-size: 14px; margin: 0 0 8px 0;">Your affiliate code</p>
                <p style="color: #22c55e; font-size: 32px; font-weight: bold; margin: 0; font-family: monospace;">${data.code}</p>
              </div>
              
              <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0;">
                Your Commission Structure
              </h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 12px; background: #1a1a24; border-radius: 8px;">
                    <span style="color: #ffffff; font-weight: bold;">30-50%</span>
                    <span style="color: #a0a0b0;"> recurring commission</span>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px; background: #1a1a24; border-radius: 8px;">
                    <span style="color: #eab308; font-weight: bold;">+$150</span>
                    <span style="color: #a0a0b0;"> bonus for Founding 50 sales</span>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px; background: #1a1a24; border-radius: 8px;">
                    <span style="color: #eab308; font-weight: bold;">+$100</span>
                    <span style="color: #a0a0b0;"> bonus for Early Bird sales</span>
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center;">
                <a href="https://agentworks.dev/affiliate" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  View Your Dashboard
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `Congratulations, ${data.name}!

You've been approved as an AgentWorks affiliate.

Your affiliate code: ${data.code}

Your Commission Structure:
- 30-50% recurring commission
- +$150 bonus for Founding 50 sales
- +$100 bonus for Early Bird sales

View your dashboard: https://agentworks.dev/affiliate`,
  }),

  founderPurchaseConfirmation: (data: { email: string; planName: string; price: number }) => ({
    subject: `Welcome to AgentWorks ${data.planName}! 🚀`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td style="padding: 40px; background: linear-gradient(135deg, rgba(234,179,8,0.1), rgba(99,102,241,0.1)); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 24px 0; text-align: center;">
                Welcome to the ${data.planName}! 🎉
              </h1>
              
              <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Thank you for believing in AgentWorks! You now have lifetime access to all features.
              </p>
              
              <div style="background: rgba(234,179,8,0.2); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                <p style="color: #a0a0b0; font-size: 14px; margin: 0 0 8px 0;">Your investment</p>
                <p style="color: #eab308; font-size: 48px; font-weight: bold; margin: 0;">$${data.price}</p>
                <p style="color: #a0a0b0; font-size: 14px; margin: 8px 0 0 0;">lifetime access</p>
              </div>
              
              <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0;">
                What's Next?
              </h2>
              
              <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                We're working hard to get AgentWorks ready for you. As a ${data.planName} member, you'll be among the first to get access when we launch.
              </p>
              
              <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                In the meantime, join our Discord community to connect with other founders and get exclusive previews.
              </p>
              
              <div style="text-align: center;">
                <a href="https://discord.gg/agentworks" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Join Our Discord
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `Welcome to the ${data.planName}!

Thank you for believing in AgentWorks! You now have lifetime access to all features.

Your investment: $${data.price} lifetime access

What's Next?
We're working hard to get AgentWorks ready for you. As a ${data.planName} member, you'll be among the first to get access when we launch.

Join our Discord: https://discord.gg/agentworks`,
  }),
};

export async function sendWaitlistWelcome(email: string, position: number, referralCode: string) {
  const template = emailTemplates.waitlistWelcome({ email, position, referralCode });
  return sendEmail({ to: email, ...template });
}

export async function sendAffiliateApproved(email: string, name: string, code: string) {
  const template = emailTemplates.affiliateApproved({ name, code });
  return sendEmail({ to: email, ...template });
}

export async function sendFounderPurchaseConfirmation(email: string, planName: string, price: number) {
  const template = emailTemplates.founderPurchaseConfirmation({ email, planName, price });
  return sendEmail({ to: email, ...template });
}

export async function sendWaitlistInvite(email: string, name: string, referralCode: string) {
  const template = {
    subject: "You're Invited to AgentWorks! 🚀",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentWorks Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td style="padding: 40px; background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1)); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 24px 0; text-align: center;">
                Hey ${name}, You're Invited! 🎉
              </h1>

              <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Great news! It's your turn to join AgentWorks - the Kanban for AI Development. Your account is ready and waiting.
              </p>

              <div style="background: rgba(99,102,241,0.2); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                <p style="color: #a0a0b0; font-size: 14px; margin: 0 0 16px 0;">Click below to activate your account</p>
                <a href="https://app.agentworks.dev/signup?invite=${referralCode}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Activate Your Account
                </a>
              </div>

              <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0;">
                What you'll get:
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 12px; background: #1a1a24; border-radius: 8px; margin-bottom: 8px;">
                    <span style="color: #6366f1;">✓</span>
                    <span style="color: #a0a0b0; font-size: 14px;"> 11 Specialist AI Agents</span>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px; background: #1a1a24; border-radius: 8px;">
                    <span style="color: #6366f1;">✓</span>
                    <span style="color: #a0a0b0; font-size: 14px;"> Visual Kanban Production Line</span>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px; background: #1a1a24; border-radius: 8px;">
                    <span style="color: #6366f1;">✓</span>
                    <span style="color: #a0a0b0; font-size: 14px;"> CEO CoPilot Oversight</span>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 12px; background: #1a1a24; border-radius: 8px;">
                    <span style="color: #6366f1;">✓</span>
                    <span style="color: #a0a0b0; font-size: 14px;"> Blueprint-First Methodology</span>
                  </td>
                </tr>
              </table>

              <p style="color: #606070; font-size: 14px; text-align: center; margin: 24px 0 0 0;">
                This invitation expires in 7 days. Don't miss out!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="color: #606070; font-size: 12px; margin: 0;">
                AgentWorks • 11 AI Agents, One Blueprint, Zero Chaos
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `Hey ${name}, You're Invited to AgentWorks!

Great news! It's your turn to join AgentWorks - the Kanban for AI Development.

Click here to activate your account:
https://app.agentworks.dev/signup?invite=${referralCode}

What you'll get:
- 11 Specialist AI Agents
- Visual Kanban Production Line
- CEO CoPilot Oversight
- Blueprint-First Methodology

This invitation expires in 7 days. Don't miss out!

AgentWorks - 11 AI Agents, One Blueprint, Zero Chaos`,
  };
  return sendEmail({ to: email, ...template });
}
