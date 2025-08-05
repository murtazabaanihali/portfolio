import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMail = async (to: string | null, from?: string) => {
    const _from = from || process.env.EMAIL_SENDER;
    const _to = to || process.env.EMAIL_SENDER;

    if (!_from || !_to) {
        throw new Error(
            `No 'From' or 'To' addresses provided when sending the email.`
        );
    };

    const { error, data } = await resend.emails.send({
        from: _from!,
        to: _to!,
        subject: "Someone contacted you",
        html: "Body",
    });

    if (error) {
        console.error(
            `Error sending email using resend: ${JSON.stringify(error, null, 2)}`,
            "From: ",
            _from,
            "TO: ",
            to
        );
    };

    return null;
};
