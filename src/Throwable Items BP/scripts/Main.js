import { world, system, Vector, Location, ItemStack } from '@minecraft/server';
import * as throwables from "throwables.json"

let playersThrowing = new Map();

world.events.itemStartCharge.subscribe(eventData => {
	const item = eventData.itemStack.typeId;
	if (!throwables[item]) return;
	const player = eventData.source;
	const throwLoop = system.runSchedule(() => {
		if (!playersThrowing.has(player.id)) {
			system.clearRunSchedule(throwLoop);
			return;
		}
		fire(player, item, throwLoop);
	}, throwables[item].throwRate)
	playersThrowing.set(player.id, throwLoop);
	fire(player, item, throwLoop);
})

world.events.itemStopCharge.subscribe(eventData => {
	playersThrowing.delete(eventData.source.id);
})

function fire(player, item, scheduleId) {
	if (!playersThrowing.has(player.id) || playersThrowing.get(player.id) !== scheduleId) {
		system.clearRunSchedule(playersThrowing.get(player.id));
		return;
	}
	const { x, y, z } = Vector.add(player.headLocation, player.viewDirection);
	player.dimension.spawnEntity(throwables[item].projectile, new Location(x, y, z)).setVelocity(new Vector(player.viewDirection.x * throwables[item].projectileVelo, player.viewDirection.y * throwables[item].projectileVelo, player.viewDirection.z * throwables[item].projectileVelo));
	if (throwables[item].consumeOnThrow) {
		player.runCommandAsync(`clear @s ${item} 0 1`);
	} else if (throwables[item].changeDataOnThrow) {
		const inv = player.getComponent('minecraft:inventory').container
		const replaceItem = inv.getItem(player.selectedSlot);
		replaceItem.data = replaceItem.data + 1;
		inv.setItem(player.selectedSlot, replaceItem);
	}
}