# Weapon relationship export request

Draft only. This has not been sent to anyone.

Hi,

I'm building a free Arena Breakout: Infinite loadout randomizer. We have a local item and icon snapshot, but need weapon assembly relationships so randomized guns can actually be assembled and fired.

Do you have an export of the Gunsmith slot and compatibility tables? JSON, CSV, or the original structured tables would work. We need:

- Stable IDs for each weapon, attachment, and magazine.
- Slots exposed by each receiver or attachment, with IDs for the parts each slot accepts.
- Required parts for a functional gun, including default components that are integrated or not removable.
- Adapters and the additional slots they expose.
- Exclusions such as barrel and handguard length conflicts.
- Slot counts and locations for repeated items, such as two tactical lights on different rails.
- Magazine compatibility, capacity, and internal or detachable loading behavior.
- The game version or capture date for the tables.

Weapon-wide supported tags and build codes alone do not contain these relationships. We do not need player data, account access, or a live service. A one-time offline export is enough to get started, and we will credit the source.

Thanks.
