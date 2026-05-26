# Supabase Auth Email Setup

Use this checklist before enabling public account creation. The app can pass the correct redirect URL, but deliverability and email copy are controlled in Supabase and your email provider.

## 1. Redirect URLs

In Supabase Dashboard, open **Authentication > URL Configuration**.

- **Site URL:** `https://rotationforge.gg`
- **Redirect URLs:** add `https://rotationforge.gg/*`

The frontend passes the current app URL to Supabase for signup confirmation and password reset, so these URLs must be allowed.

## 2. Custom SMTP

Do not use the default Supabase mail sender for production account emails. Configure your own sender in **Authentication > SMTP Settings**.

Recommended sender pattern:

- From name: `Rotation Forge`
- From email: `accounts@rotationforge.gg`, `no-reply@rotationforge.gg`, or a verified subdomain such as `no-reply@auth.rotationforge.gg`
- Reply-to: an address you can actually receive, for example `support@rotationforge.gg`

Set the DNS records required by your SMTP provider:

- SPF
- DKIM
- DMARC

These records are the main piece that keeps confirmation emails out of spam. Supabase's built-in mail server is for getting started and is not meant to be the production sender.

If possible, also configure a Supabase custom auth domain so links in emails use your own domain instead of the shared Supabase project domain.

## 3. Confirm Signup Template

In Supabase Dashboard, open **Authentication > Email Templates > Confirm signup**.

Subject:

```text
Confirm your Rotation Forge account
```

Body:

```html
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;padding:0;background:#0f1117;">
  <tr>
    <td align="center" style="padding:32px 16px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#f6f7fb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#171a23;border:1px solid #2a2f3d;border-radius:16px;overflow:hidden;">
        <tr>
          <td>
            <img src="https://rotationforge.gg/endfield/assets/header.png" alt="Rotation Forge" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px 12px;">
            <p style="margin:0 0 10px;color:#8bd3ff;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Account confirmation</p>
            <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2;font-weight:800;">Welcome to Rotation Forge</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px;color:#cfd5e3;font-size:16px;line-height:1.6;">
            <p style="margin:0 0 16px;">Confirm your email address to save private rotations, keep your setups synced, and submit rotations for Community review.</p>
            <p style="margin:26px 0;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#4cc9f0;color:#071018;text-decoration:none;font-weight:800;border-radius:10px;padding:14px 22px;">Confirm email address</a>
            </p>
            <p style="margin:0 0 8px;color:#9aa3b8;font-size:13px;">If the button does not work, copy this link into your browser:</p>
            <p style="margin:0;word-break:break-all;font-size:13px;">
              <a href="{{ .ConfirmationURL }}" style="color:#8bd3ff;">{{ .ConfirmationURL }}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 28px;border-top:1px solid #2a2f3d;color:#8c95aa;font-size:12px;line-height:1.5;">
            If you did not create this account, you can ignore this email.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

## 4. Reset Password Template

In Supabase Dashboard, open **Authentication > Email Templates > Reset password**.

Subject:

```text
Reset your Rotation Forge password
```

Body:

```html
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;padding:0;background:#0f1117;">
  <tr>
    <td align="center" style="padding:32px 16px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#f6f7fb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#171a23;border:1px solid #2a2f3d;border-radius:16px;overflow:hidden;">
        <tr>
          <td>
            <img src="https://rotationforge.gg/endfield/assets/header.png" alt="Rotation Forge" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px 12px;">
            <p style="margin:0 0 10px;color:#8bd3ff;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Password reset</p>
            <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2;font-weight:800;">Reset your password</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px;color:#cfd5e3;font-size:16px;line-height:1.6;">
            <p style="margin:0 0 16px;">Use this link to choose a new password for your Rotation Forge account.</p>
            <p style="margin:26px 0;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#4cc9f0;color:#071018;text-decoration:none;font-weight:800;border-radius:10px;padding:14px 22px;">Reset password</a>
            </p>
            <p style="margin:0 0 8px;color:#9aa3b8;font-size:13px;">If the button does not work, copy this link into your browser:</p>
            <p style="margin:0;word-break:break-all;font-size:13px;">
              <a href="{{ .ConfirmationURL }}" style="color:#8bd3ff;">{{ .ConfirmationURL }}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 28px;border-top:1px solid #2a2f3d;color:#8c95aa;font-size:12px;line-height:1.5;">
            If you did not request this, you can ignore this email.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

## 5. Deliverability Notes

- Keep the subject simple and honest.
- Use the same domain for the app and the sender if possible.
- Avoid image-only emails, too many links, and sales-style wording.
- Test with Gmail, Outlook, and one independent mail tester before launch.
- Send from a real SMTP provider with domain verification enabled.
