import { resolver } from "@blitzjs/rpc";
import stripe, { stripeEnabled } from "integrations/stripe";
import db from "db";

const getOrganization = resolver.pipe(
  resolver.authorize(),
  async (_input, ctx) => {
    const organization = await db.organization.findFirstOrThrow({
      where: {
        id: ctx.session.orgId,
        membership: {
          some: {
            userId: ctx.session.userId,
          },
        },
      },
      include: {
        membership: {
          select: {
            id: true,
            role: true,
            invitedName: true,
            invitedEmail: true,
            membershipStatus: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const customer =
      stripeEnabled && organization.stripeCustomerId
        ? await stripe.customers.retrieve(organization.stripeCustomerId, {
            expand: [
              "subscriptions",
              "subscriptions.data.default_payment_method",
              "invoice_settings.default_payment_method",
            ],
          })
        : null;

    return {
      organization,
      customer,
    };
  }
);

export default getOrganization;

export type Member = Awaited<
  ReturnType<typeof getOrganization>
>["organization"]["membership"][0];
