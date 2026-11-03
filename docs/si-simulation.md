# Si in the rotation planner

Source: https://endfieldtools.dev/localdb/optimized/characters/details/chr_0036_jsspsi.json
Rank: 12. Original skill icons are already included in the repository.

Si's catalog record currently has no simulator rows. The loader provides default actions only when operator 33 (`si`) has no database skills. Database skills continue to take precedence.

- Final Strike uses the fifth sequence's 144% multiplier, not the separate 900% finisher.
- Brushwork Realm costs 100 SP and deals 100% Cryo damage. It applies Cryo Infliction, or Heat Infliction when team position 01 is Heat, and one second of Immobilization.
- Artful Intent records 13% of subsequent team damage, including basic attacks, for 20 seconds. The application hit is excluded. Reapplication replaces the previous mark without a burst.
- Initial Stroke costs 15 SP and draws the Inksoul without resetting the mark's expiry. Final Stroke costs zero SP and triggers an early burst only after an Inksoul was drawn.
- Fully Envisioned triggers on consumed Cryo/Heat Infliction. Its 750% base multiplier gains 100% per consumed stack, using the highest stack count rather than adding Heat and Cryo counts.
- No One Spoils the Fun costs 80 energy, deals 500% Cryo damage and grants 36% Cryo/Heat Amp for 12 seconds. Each Amp applies only to its corresponding element and starts after the Ultimate's own damage.

The recorded burst has its own log entry and chart contribution. Damage modes keep separate sums; already mitigated damage receives no second mitigation, bonus or crit roll. Unknown mitigation remains unknown. A burst beyond the simulated duration is omitted. Events exactly at expiry occur after the expired mark's burst.

## Host transfer

With Si on the team, Simulation → Combat Events offers three labeled events. Place them at the intended time using the existing combat-event lane:

- **NEXT — Host defeated → next enemy**: a drawn Inksoul links to the next host. Original expiry and all recorded damage remain unchanged. It can transfer repeatedly.
- **END — Last enemy defeated**: the Inksoul has no living host. Recording and damage bursts stop until another enemy is available.
- **NEW — New enemy enters combat**: a drawn Inksoul waiting for a host links to this enemy if its original duration has not expired. Adding an enemy while the current host is alive does not switch the host.

An undrawn Inksoul is logged as dropped when its host dies; it is not silently treated as a drawn Inksoul or transferred. Picking up a dropped Inksoul is not simulated. Transfers and drops appear in the log, including previous/new host, remaining time, expiry and stored damage. The selected enemy profile is reused for sequential hosts. These are manually placed scenarios, not deaths inferred from HP or damage.

Optional engine event fields `targetId` / `targetIds` restrict which hits are recorded. `inksoul:33` identifies the drawn Inksoul. Hits carrying the same `damageInstanceId` count once if they overlap host and Inksoul. Without explicit target fields, subsequent hits follow the current living host. Host events may provide `defeatedTargetId` and `nextTargetId`; a death of an unrelated target does not move the mark.

## Limits

Hosts and Inksoul share one damage stream, so drawing an Inksoul does not duplicate damage. Different simultaneous enemy profiles, automatic HP-based defeat, and pickup of undrawn ground Inksouls are not modeled. Recording follows the planner's existing event/hit timing. Reapplication and expiration ordering are explicit simulation assumptions, not frame-verified game behavior. Passive talents, potentials, exact attack animations and multi-target overlap still need separate verification; default damage profiles remain marked unverified.
