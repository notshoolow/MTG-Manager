import { PrismaClient } from '@prisma/client';
import axios from 'axios';
// @ts-ignore
import { StreamArray } from 'stream-json/streamers/StreamArray';
// @ts-ignore
import { chain } from 'stream-chain';
// @ts-ignore
import { parser } from 'stream-json';

const prisma = new PrismaClient();

async function main() {
  const syncLog = await prisma.syncLog.create({
    data: {
      type: "BULK_SYNC",
      status: "IN_PROGRESS"
    }
  });

  try {
    console.log("Fetching bulk data URI from Scryfall...");
    const { data: bulkInfo } = await axios.get("https://api.scryfall.com/bulk-data/default-cards");
    const downloadUri = bulkInfo.download_uri;
    
    console.log(`Downloading default cards from ${downloadUri}...`);
    const { data: stream } = await axios.get(downloadUri, { responseType: 'stream' });

    const pipeline = chain([
      stream,
      parser(),
      new StreamArray()
    ]);

    let count = 0;
    const batchSize = 1000;
    let batch: any[] = [];

    const processBatch = async () => {
      if (batch.length === 0) return;
      console.log(`Upserting batch of ${batch.length} cards... (Total processed: ${count})`);
      
      const transactions = batch.map(c => {
        const value = c.value;
        const prices = value.prices || {};
        const legalities = value.legalities || {};
        const imageUris = value.image_uris || (value.card_faces && value.card_faces[0]?.image_uris) || {};
        
        return prisma.scryfallCard.upsert({
          where: { id: value.id },
          update: {
            priceEur: prices.eur ? parseFloat(prices.eur) : null,
            priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
            priceUsd: prices.usd ? parseFloat(prices.usd) : null,
            priceUsdFoil: prices.usd_foil ? parseFloat(prices.usd_foil) : null,
            pricesUpdatedAt: new Date(),
          },
          create: {
            id: value.id,
            oracleId: value.oracle_id || value.id,
            name: value.name,
            setCode: value.set,
            setName: value.set_name,
            collectorNumber: value.collector_number,
            rarity: value.rarity,
            typeLine: value.type_line || "",
            oracleText: value.oracle_text,
            manaCost: value.mana_cost,
            colors: JSON.stringify(value.colors || []),
            colorIdentity: JSON.stringify(value.color_identity || []),
            imageUris: JSON.stringify(imageUris),
            finishes: JSON.stringify(value.finishes || []),
            lang: value.lang,
            priceEur: prices.eur ? parseFloat(prices.eur) : null,
            priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
            priceUsd: prices.usd ? parseFloat(prices.usd) : null,
            priceUsdFoil: prices.usd_foil ? parseFloat(prices.usd_foil) : null,
            pricesUpdatedAt: new Date(),
            scryfallUri: value.scryfall_uri,
            legalities: JSON.stringify(legalities)
          }
        });
      });

      // Ejecución de la tanda de forma secuencial dentro de una transacción
      await prisma.$transaction(transactions);
      batch = [];
    };

    pipeline.on('data', async (data) => {
      // Únicamente se consideran las cartas en inglés y con una distribución (layout) específica para simplificar el producto mínimo viable (MVP).
      // Sin embargo, los datos masivos de Scryfall contienen múltiples distribuciones. Se acepta todo excepto series de arte, fichas (tokens), etc.
      // El conjunto de datos "default-cards" ya aplica ciertos filtros, pero se aplican restricciones adicionales por seguridad.
      const value = data.value;
      if (value.layout !== 'art_series' && value.layout !== 'token' && value.lang === 'en') {
        batch.push(data);
        count++;
        if (batch.length >= batchSize) {
          pipeline.pause();
          try {
            await processBatch();
            pipeline.resume();
          } catch (error: any) {
            console.error("Batch processing error:", error);
            await prisma.syncLog.update({
              where: { id: syncLog.id },
              data: {
                status: "FAILED",
                error: error.message,
                finishedAt: new Date()
              }
            });
            process.exit(1);
          }
        }
      }
    });

    pipeline.on('end', async () => {
      await processBatch();
      console.log(`Sync complete! Processed ${count} cards.`);
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "SUCCESS",
          cardsUpserted: count,
          finishedAt: new Date()
        }
      });
      process.exit(0);
    });

    pipeline.on('error', async (error: any) => {
      console.error("Stream error:", error);
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          error: error.message,
          finishedAt: new Date()
        }
      });
      process.exit(1);
    });

  } catch (error: any) {
    console.error("Error fetching Scryfall data:", error);
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "FAILED",
        error: error.message,
        finishedAt: new Date()
      }
    });
    process.exit(1);
  }
}

main();
