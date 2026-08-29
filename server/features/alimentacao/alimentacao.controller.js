import * as service from "./alimentacao.service.js";

export async function getStatus(req, res, next) {
  try {
    const status = await service.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
}
