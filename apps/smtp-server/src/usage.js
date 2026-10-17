const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "localhost",
  port: 25,
  secure: false,
  auth: {
    user: "f14",
    pass: "us_123",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const mailOptions = {
  to: "sender@example.com",
  from: "hello@example.com",
  subject: "Testing SMTP",
  html: "<strong>THIS IS USING SMTP,</strong><p>F14 SMTP test email</p><p>Learn more at <a href='https://f14.dev'>f14.dev</a></p>",
  text: "hello,\n\nThis is an F14 SMTP test email",
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error("Error sending email:", error);
  } else {
    console.log("Email sent successfully:", info.response);
  }
});
