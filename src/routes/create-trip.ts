import type { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import { date, z } from "zod"
import { prisma } from "../lib/prisma"
import dayjs from "dayjs"
import nodemailer from 'nodemailer'
import { getMailClient } from "../lib/mail"


export async function createTrip(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/trips', {
        schema: {
            body: z.object({
                destination: z.string().min(4),
                start_at: z.coerce.date(),
                end_at: z.coerce.date(),
                owner_name: z.string(),
                owner_email: z.string().email()
            })
        }
    }, async (request) =>{
        const { destination, start_at, end_at, owner_name, owner_email } = request.body

        if (dayjs(start_at).isBefore(new Date())) {
            throw new Error('Invalid trip start date')
        }

        if (dayjs(end_at).isBefore(start_at)) {
            throw new Error('Invalid trip end date')
        }

        

        const trip = await prisma.trip.create({
            data: {
                destination,
                start_at,
                end_at,
                participants: {
                    create: {
                        name: owner_name,
                        email: owner_email,
                    }
                }
            }
        })

        const mail = await getMailClient()

        const message = await mail.sendMail({
            from: {
                name: 'Equipe plann.er',
                address: 'oi@plan.er',
            },
            to: {
                name: owner_name,
                address: owner_email,
            },
            subject: 'Testando envio de e-mail',
            html: '<p>Teste do envio de e-mail<p/>'
        })

        console.log(nodemailer.getTestMessageUrl(message))

        return { tripId: trip.id }
    })
}