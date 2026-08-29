import * as service from "./auth.service.js";

export async function login(req, res, next) {
  try {
    const result = await service.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await service.logout(req.body);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
