import nodemailer from 'nodemailer';

let defaultTransporter: nodemailer.Transporter | null = null;
let defaultAccount: nodemailer.TestAccount | null = null;

export async function getDefaultEtherealTransporter() {
  if (defaultTransporter) {
    return { transporter: defaultTransporter, account: defaultAccount };
  }

  try {
    defaultAccount = await nodemailer.createTestAccount();
    defaultTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: defaultAccount.user,
        pass: defaultAccount.pass,
      },
    });
    console.log(` Created default Ethereal test SMTP account: ${defaultAccount.user}`);
    return { transporter: defaultTransporter, account: defaultAccount };
  } catch (error) {
    console.error(' Failed to create Ethereal SMTP account:', error);
    throw error;
  }
}

export function createCustomTransporter(host: string, port: number, user: string, pass: string) {
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}
