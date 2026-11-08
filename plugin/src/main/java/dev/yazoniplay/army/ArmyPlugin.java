package dev.yazoniplay.army;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.Queue;
import java.util.UUID;
import java.util.concurrent.Executors;

public final class ArmyPlugin extends JavaPlugin {
    private final Queue<String> commands = new ArrayDeque<>();
    private HttpServer server;
    private String token;

    @Override public void onEnable() {
        saveDefaultConfig();
        token = getConfig().getString("bridge.token", "");
        if (token.length() < 24 || token.startsWith("CHANGE_")) {
            getLogger().severe("Set bridge.token to a private random value (at least 24 characters). Bridge disabled.");
            return;
        }
        try {
            String host = getConfig().getString("bridge.host", "127.0.0.1");
            int port = getConfig().getInt("bridge.port", 8765);
            server = HttpServer.create(new InetSocketAddress(host, port), 0);
            server.createContext("/health", exchange -> respond(exchange, 200, "{\"ok\":true}"));
            server.createContext("/api/poll", this::poll);
            server.setExecutor(Executors.newSingleThreadExecutor(r -> {
                Thread thread = new Thread(r, "minecraft-army-bridge");
                thread.setDaemon(true);
                return thread;
            }));
            server.start();
            getLogger().info("Local army bridge listening on " + host + ":" + port);
        } catch (IOException exception) {
            getLogger().severe("Could not start local bridge: " + exception.getMessage());
        }
    }

    @Override public void onDisable() {
        if (server != null) server.stop(0);
    }

    private void poll(HttpExchange exchange) throws IOException {
        if (!"GET".equals(exchange.getRequestMethod())) { respond(exchange, 405, "{\"error\":\"method_not_allowed\"}"); return; }
        String supplied = exchange.getRequestHeaders().getFirst("Authorization");
        if (supplied == null || !constantTimeEquals(token, supplied.replaceFirst("^Bearer ", ""))) {
            respond(exchange, 401, "{\"error\":\"unauthorized\"}"); return;
        }
        String next;
        synchronized (commands) { next = commands.poll(); }
        String body = next == null ? "{\"command\":null}" : "{\"command\":\"" + next + "\"}";
        respond(exchange, 200, body);
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) { output.write(bytes); }
    }

    private boolean enqueue(String command) {
        synchronized (commands) {
            int max = Math.max(1, getConfig().getInt("bridge.max-queued-commands", 100));
            if (commands.size() >= max) return false;
            commands.add(command);
            return true;
        }
    }

    @Override public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!command.getName().equalsIgnoreCase("army")) return false;
        if (!sender.hasPermission("minecraftarmy.admin")) { sender.sendMessage(ChatColor.RED + "You do not have permission."); return true; }
        if (args.length == 0) { help(sender); return true; }
        String action = args[0].toLowerCase();
        String payload;
        switch (action) {
            case "spawn" -> {
                if (args.length != 2 || !args[1].matches("(?i)all|nour|chaos")) { sender.sendMessage(ChatColor.YELLOW + "Usage: /army spawn <all|nour|chaos>"); return true; }
                payload = "spawn " + args[1].toLowerCase();
            }
            case "stop" -> payload = "stop";
            case "status" -> payload = "status";
            case "build" -> {
                if (args.length != 2 || !args[1].equalsIgnoreCase("castle")) { sender.sendMessage(ChatColor.YELLOW + "Usage: /army build castle"); return true; }
                payload = "build castle";
            }
            default -> { help(sender); return true; }
        }
        if (server == null) { sender.sendMessage(ChatColor.RED + "Army bridge is offline. Check the plugin token and console."); return true; }
        if (!enqueue(payload)) { sender.sendMessage(ChatColor.RED + "Command queue full. Try again in a moment."); return true; }
        sender.sendMessage(ChatColor.GREEN + "Army command queued: " + ChatColor.WHITE + payload);
        return true;
    }

    private void help(CommandSender sender) {
        sender.sendMessage(ChatColor.GOLD + "Minecraft Army");
        sender.sendMessage(ChatColor.YELLOW + "/army spawn <all|nour|chaos>");
        sender.sendMessage(ChatColor.YELLOW + "/army stop");
        sender.sendMessage(ChatColor.YELLOW + "/army status");
        sender.sendMessage(ChatColor.YELLOW + "/army build castle");
    }
}
