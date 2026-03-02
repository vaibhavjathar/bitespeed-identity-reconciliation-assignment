import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.post('/identify', async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phone number is required" });
  }

  try {
    // 1. Initial match based on provided email or phone
    const initialMatches = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phoneNumber?.toString() || undefined },
        ],
      },
    });

    // 2. Scenario A: Brand New User
    if (initialMatches.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber: phoneNumber?.toString(),
          linkPrecedence: "primary",
        },
      });
      return res.json({
        contact: {
          primaryContatctId: newContact.id,
          emails: [newContact.email].filter(Boolean),
          phoneNumbers: [newContact.phoneNumber].filter(Boolean),
          secondaryContactIds: [],
        },
      });
    }

    // 3. Find the absolute "Root" (Oldest Primary)
    // We fetch all related contacts to handle transitive links
    const foundPrimaryIds = initialMatches.map(c => c.linkedId || c.id);
    
    let allRelatedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: { in: foundPrimaryIds } },
          { linkedId: { in: foundPrimaryIds } },
          { email: email || undefined },
          { phoneNumber: phoneNumber?.toString() || undefined }
        ]
      }
    });

    const primaries = allRelatedContacts
      .filter(c => c.linkPrecedence === "primary")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    let primaryContact = primaries[0];

    // 4. Scenario B: Merging two existing Primary contacts
    if (primaries.length > 1) {
      const secondaryPrimaries = primaries.slice(1);
      for (const sp of secondaryPrimaries) {
        await prisma.contact.update({
          where: { id: sp.id },
          data: {
            linkPrecedence: "secondary",
            linkedId: primaryContact.id,
          },
        });
        // Update their children too
        await prisma.contact.updateMany({
          where: { linkedId: sp.id },
          data: { linkedId: primaryContact.id }
        });
      }
      // Refresh cluster data
      allRelatedContacts = await prisma.contact.findMany({
        where: {
          OR: [{ id: primaryContact.id }, { linkedId: primaryContact.id }]
        }
      });
    }

    // 5. Scenario C: Partial match but contains New Information
    const existingEmails = new Set(allRelatedContacts.map(c => c.email));
    const existingPhones = new Set(allRelatedContacts.map(c => c.phoneNumber));

    if ((email && !existingEmails.has(email)) || (phoneNumber && !existingPhones.has(phoneNumber.toString()))) {
      const newSecondary = await prisma.contact.create({
        data: {
          email,
          phoneNumber: phoneNumber?.toString(),
          linkPrecedence: "secondary",
          linkedId: primaryContact.id,
        },
      });
      allRelatedContacts.push(newSecondary);
    }

    // 6. Final Data Consolidation
    const emails = Array.from(new Set(allRelatedContacts.map(c => c.email).filter((e): e is string => e !== null)));
    const phoneNumbers = Array.from(new Set(allRelatedContacts.map(c => c.phoneNumber).filter((p): p is string => p !== null)));
    
    // Ensure primary details are at the 0th index as per requirements
    const finalEmails = [primaryContact.email!, ...emails.filter(e => e !== primaryContact.email)];
    const finalPhones = [primaryContact.phoneNumber!, ...phoneNumbers.filter(p => p !== primaryContact.phoneNumber)];
    const secondaryContactIds = allRelatedContacts
      .filter(c => c.id !== primaryContact.id)
      .map(c => c.id);

    return res.json({
      contact: {
        primaryContatctId: primaryContact.id,
        emails: finalEmails,
        phoneNumbers: finalPhones,
        secondaryContactIds,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});