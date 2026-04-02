import { getAllLatestPrices, getLatestPrice } from "../storage/priceStore";
import { apiRateLimiter } from "../middleware/rateLimit.middleware";
import express, { Request, Response } from "express";

const priceRoutes = express.Router();

priceRoutes.use(apiRateLimiter);

priceRoutes.get("/all", (req: Request, res: Response) => {
    const prices = getAllLatestPrices();
    res.status(200).json(prices);
});

priceRoutes.get("/:symbol", (req: Request, res: Response) => {
    const symbol = req.params.symbol as string;
    const price = getLatestPrice(symbol);
    if (!price) {
        res.status(404).json({ error: "Price not found" });
        return; 
    }
    res.status(200).json(price);
});

export default priceRoutes;