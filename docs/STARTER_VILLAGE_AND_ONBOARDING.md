# Starter Village and Account Onboarding

## Player flow
1. The title modal allows account registration or login.
2. Registration creates a player account and returns an access token.
3. On page load, the client verifies the token with `GET /api/v1/auth/me`.
4. The client fetches only the authenticated account's characters.
5. Accounts without a character are directed to Character Creation.
6. Character creation posts the selected name, gender, class, appearance and validated attributes to `POST /api/v1/characters`.
7. The new character is stored server-side, cached for scene boot, and joined through the authenticated Socket.IO gateway.

## Account rules
- Username: 3–20 Unicode letters/numbers, underscore or hyphen.
- Email: basic email-format validation and uniqueness.
- Password: minimum 8 characters; bcrypt input is limited to 72 UTF-8 bytes.
- Character ownership is derived from the verified JWT, never from a client-supplied user ID.
- Each account can own up to four characters.
- Character gender, class, appearance colors and attribute allocation are validated server-side.

## Starter village
- Region: `VIL_STARTER`, 2000 × 2000 world units.
- New-character spawn: `(1000, 1350)`, south of the central fountain to avoid spawning directly on the village elder.
- Safe zone: combat disabled and no monster spawns.
- Client map: grass ground, outer fence, four stone roads, central plaza/fountain, village buildings, gatehouses, tree clusters and server-loaded NPC markers.
- NPC positions and labels are loaded from the canonical world data API.
- Portal destinations and gate coordinates are loaded from `GET /api/v1/game/connections`; the server validates the required level and distance to each portal.

## Important limitations
- Buildings, trees, roads and NPC markers are currently Phaser-drawn placeholder art, not final production sprite/tile assets.
- NPC markers show the NPC description; full dialogue, quest acceptance, shop and storage interactions remain separate gameplay work.
- The four field regions already exist in world data, but this change focuses the visual scene on the starter village. Full field-specific terrain and monster sprite rendering must be completed before treating all four portal destinations as finished.
- The repository uses JSON persistence. It is suitable for early development, not concurrent production deployment.
- Run client/server typechecks, builds and a real register → login → create character → reload → join test before merging.
