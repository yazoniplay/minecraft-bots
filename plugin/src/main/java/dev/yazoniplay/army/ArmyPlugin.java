package dev.yazoniplay.army;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.attribute.Attribute;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Entity;
import org.bukkit.entity.EntityType;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Mob;
import org.bukkit.entity.Pillager;
import org.bukkit.entity.Player;
import org.bukkit.entity.Vindicator;
import org.bukkit.inventory.EntityEquipment;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;
import org.bukkit.scheduler.BukkitTask;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class ArmyPlugin extends JavaPlugin {
    private static final String TAG = "minecraftarmy.unit";
    private static final String NOUR = "minecraftarmy.nour";
    private static final String CHAOS = "minecraftarmy.chaos";
    private BukkitTask brainTask;
    private int spawnedNour;
    private int spawnedChaos;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        brainTask = Bukkit.getScheduler().runTaskTimer(this, this::think, 10L, 10L);
        getLogger().info("Minecraft Army enabled. Server-side faction AI is active.");
    }

    @Override
    public void onDisable() {
        if (brainTask != null) brainTask.cancel();
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!command.getName().equalsIgnoreCase("army")) return false;
        if (!sender.hasPermission("minecraftarmy.admin")) {
            sender.sendMessage(ChatColor.RED + "You do not have permission.");
            return true;
        }
        if (args.length == 0) {
            help(sender);
            return true;
        }

        String action = args[0].toLowerCase(Locale.ROOT);
        switch (action) {
            case "spawn" -> {
                if (!(sender instanceof Player player)) {
                    sender.sendMessage(ChatColor.RED + "Run this command in-game so the army has a spawn location.");
                    return true;
                }
                if (args.length != 2 || !Set.of("all", "nour", "chaos").contains(args[1].toLowerCase(Locale.ROOT))) {
                    sender.sendMessage(ChatColor.YELLOW + "Usage: /army spawn <all|nour|chaos>");
                    return true;
                }
                String faction = args[1].toLowerCase(Locale.ROOT);
                if (faction.equals("all") || faction.equals("nour")) spawnedNour += spawnFaction(player, "nour");
                if (faction.equals("all") || faction.equals("chaos")) spawnedChaos += spawnFaction(player, "chaos");
                player.sendMessage(ChatColor.GREEN + "Army deployed. NOUR: " + spawnedNour + " | CHAOS: " + spawnedChaos);
            }
            case "stop" -> {
                int removed = removeArmy();
                spawnedNour = 0;
                spawnedChaos = 0;
                sender.sendMessage(ChatColor.YELLOW + "Removed " + removed + " army units.");
            }
            case "status" -> {
                int nour = count(NOUR);
                int chaos = count(CHAOS);
                sender.sendMessage(ChatColor.GOLD + "⚔ Army status  " + ChatColor.GREEN + "NOUR: " + nour
                    + ChatColor.GRAY + " | " + ChatColor.RED + "CHAOS: " + chaos);
            }
            case "build" -> {
                if (!(sender instanceof Player player)) {
                    sender.sendMessage(ChatColor.RED + "Run this command in-game.");
                    return true;
                }
                if (args.length != 2 || !args[1].equalsIgnoreCase("castle")) {
                    sender.sendMessage(ChatColor.YELLOW + "Usage: /army build castle");
                    return true;
                }
                buildCastle(player.getLocation());
                player.sendMessage(ChatColor.GREEN + "NOUR fortress construction complete.");
            }
            default -> help(sender);
        }
        return true;
    }

    private int spawnFaction(Player commander, String faction) {
        int amount = Math.max(1, Math.min(24, getConfig().getInt("army.units-per-faction", 6)));
        Location center = commander.getLocation();
        World world = center.getWorld();
        int spawned = 0;
        for (int i = 0; i < amount; i++) {
            double angle = (Math.PI * 2 * i) / amount;
            double radius = 3.5 + (i % 3);
            Location at = center.clone().add(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            at.setY(world.getHighestBlockYAt(at) + 1);
            EntityType type = i % 3 == 0 ? EntityType.PILLAGER : EntityType.VINDICATOR;
            Entity entity = world.spawnEntity(at, type);
            if (!(entity instanceof Mob mob)) {
                entity.remove();
                continue;
            }
            boolean nour = faction.equals("nour");
            String name = (nour ? ChatColor.GREEN : ChatColor.RED)
                + (nour ? "NOUR " : "CHAOS ") + (type == EntityType.PILLAGER ? "Ranger " : "Vanguard ") + (i + 1);
            mob.setCustomName(name);
            mob.setCustomNameVisible(true);
            mob.setRemoveWhenFarAway(false);
            mob.setCanPickupItems(false);
            mob.addScoreboardTag(TAG);
            mob.addScoreboardTag(nour ? NOUR : CHAOS);
            mob.addScoreboardTag("army.role." + (type == EntityType.PILLAGER ? "ranged" : "frontline"));
            equip(mob, nour);
            empower(mob, type == EntityType.PILLAGER);
            spawned++;
        }
        return spawned;
    }

    private void equip(Mob mob, boolean nour) {
        EntityEquipment gear = mob.getEquipment();
        if (gear == null) return;
        gear.setHelmet(new ItemStack(nour ? Material.DIAMOND_HELMET : Material.IRON_HELMET));
        gear.setChestplate(new ItemStack(nour ? Material.DIAMOND_CHESTPLATE : Material.IRON_CHESTPLATE));
        gear.setLeggings(new ItemStack(nour ? Material.DIAMOND_LEGGINGS : Material.IRON_LEGGINGS));
        gear.setBoots(new ItemStack(nour ? Material.DIAMOND_BOOTS : Material.IRON_BOOTS));
        if (mob instanceof Pillager) {
            gear.setItemInMainHand(new ItemStack(Material.CROSSBOW));
        } else {
            gear.setItemInMainHand(new ItemStack(nour ? Material.NETHERITE_AXE : Material.DIAMOND_AXE));
        }
        gear.setDropChance(EquipmentSlotCompat.HAND, 0.0f);
        gear.setHelmetDropChance(0.0f);
        gear.setChestplateDropChance(0.0f);
        gear.setLeggingsDropChance(0.0f);
        gear.setBootsDropChance(0.0f);
    }

    private void empower(Mob mob, boolean ranged) {
        setAttribute(mob, Attribute.MAX_HEALTH, ranged ? 60.0 : 90.0);
        mob.setHealth(ranged ? 60.0 : 90.0);
        setAttribute(mob, Attribute.MOVEMENT_SPEED, ranged ? 0.34 : 0.38);
        setAttribute(mob, Attribute.ARMOR, 16.0);
        setAttribute(mob, Attribute.ATTACK_DAMAGE, ranged ? 10.0 : 18.0);
        setAttribute(mob, Attribute.KNOCKBACK_RESISTANCE, 0.65);
        mob.addPotionEffect(new PotionEffect(PotionEffectType.RESISTANCE, Integer.MAX_VALUE, 0, false, false));
        mob.addPotionEffect(new PotionEffect(PotionEffectType.FIRE_RESISTANCE, Integer.MAX_VALUE, 0, false, false));
    }

    private void setAttribute(LivingEntity entity, Attribute attribute, double value) {
        var instance = entity.getAttribute(attribute);
        if (instance != null) instance.setBaseValue(value);
    }

    private void think() {
        for (World world : Bukkit.getWorlds()) {
            List<Mob> units = world.getEntitiesByClass(Mob.class).stream()
                .filter(entity -> entity.getScoreboardTags().contains(TAG) && entity.isValid())
                .toList();
            for (Mob unit : units) {
                if (unit.getTarget() != null && unit.getTarget().isValid()
                    && isEnemy(unit, unit.getTarget())) continue;
                LivingEntity target = world.getNearbyLivingEntities(unit.getLocation(), 24, 10, 24).stream()
                    .filter(candidate -> candidate != unit && isEnemy(unit, candidate))
                    .min(Comparator.comparingDouble(candidate -> candidate.getLocation().distanceSquared(unit.getLocation())))
                    .orElse(null);
                if (target != null) unit.setTarget(target);
            }
        }
    }

    private boolean isEnemy(Mob unit, LivingEntity candidate) {
        if (!candidate.isValid() || candidate.isDead()) return false;
        Set<String> tags = unit.getScoreboardTags();
        if (candidate.getScoreboardTags().contains(TAG)) {
            boolean same = (tags.contains(NOUR) && candidate.getScoreboardTags().contains(NOUR))
                || (tags.contains(CHAOS) && candidate.getScoreboardTags().contains(CHAOS));
            return !same;
        }
        return candidate instanceof Player player && !player.hasPermission("minecraftarmy.safe");
    }

    private int removeArmy() {
        int removed = 0;
        for (World world : Bukkit.getWorlds()) {
            for (Entity entity : new ArrayList<>(world.getEntities())) {
                if (entity.getScoreboardTags().contains(TAG)) {
                    entity.remove();
                    removed++;
                }
            }
        }
        return removed;
    }

    private int count(String factionTag) {
        return (int) Bukkit.getWorlds().stream().flatMap(world -> world.getEntities().stream())
            .filter(entity -> entity.getScoreboardTags().contains(TAG)
                && entity.getScoreboardTags().contains(factionTag)).count();
    }

    private void buildCastle(Location center) {
        World world = center.getWorld();
        int x0 = center.getBlockX() + 8;
        int y0 = world.getHighestBlockYAt(center) + 1;
        int z0 = center.getBlockZ() + 8;
        for (int y = 0; y < 6; y++) {
            for (int n = -10; n <= 10; n++) {
                if (!(Math.abs(n) <= 1 && y < 3)) {
                    place(world, x0 + n, y0 + y, z0 - 10, Material.STONE_BRICKS);
                    place(world, x0 + n, y0 + y, z0 + 10, Material.STONE_BRICKS);
                    place(world, x0 - 10, y0 + y, z0 + n, Material.STONE_BRICKS);
                    place(world, x0 + 10, y0 + y, z0 + n, Material.STONE_BRICKS);
                }
            }
        }
        for (int[] corner : new int[][]{{-10,-10},{10,-10},{-10,10},{10,10}}) {
            for (int y = 0; y < 12; y++) {
                for (int dx = -2; dx <= 2; dx++) for (int dz = -2; dz <= 2; dz++) {
                    if (y < 9 || Math.abs(dx) == 2 || Math.abs(dz) == 2) {
                        place(world, x0 + corner[0] + dx, y0 + y, z0 + corner[1] + dz, Material.DEEPSLATE_BRICKS);
                    }
                }
            }
        }
    }

    private void place(World world, int x, int y, int z, Material material) {
        world.getBlockAt(x, y, z).setType(material, false);
    }

    private void help(CommandSender sender) {
        sender.sendMessage(ChatColor.GOLD + "Minecraft Army");
        sender.sendMessage(ChatColor.YELLOW + "/army spawn <all|nour|chaos>");
        sender.sendMessage(ChatColor.YELLOW + "/army stop");
        sender.sendMessage(ChatColor.YELLOW + "/army status");
        sender.sendMessage(ChatColor.YELLOW + "/army build castle");
    }
}
