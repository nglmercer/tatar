{
  description = "Tauri + Rust + Axum Dev Environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, rust-overlay, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        # 1. Linux Libraries: Mandatory for Tauri v2 (Windowing & Webview)
        linuxLibraries = with pkgs; [
          openssl
          dbus
          glib
          gtk3
          libsoup
          webkitgtk_4_1 # Modern WebKit for Tauri
          librsvg
        ];

        # 2. macOS Frameworks: Needed for Windowing and Networking (Axum)
        darwinFrameworks = with pkgs.darwin.apple_sdk.frameworks; [
          AppKit
          CoreServices
          CoreFoundation
          Foundation
          WebKit
          Security
          SystemConfiguration # Required for Axum/Tokio networking
        ];

        # 3. Rust Toolchain: Using STABLE with IDE tools included
        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

      in
      {
        devShells.default = pkgs.mkShell {
          
          # Native build tools (pkg-config is crucial for finding system libs)
          nativeBuildInputs = with pkgs; [ 
            pkg-config 
          ];

          buildInputs = with pkgs; [
            # Frontend Tools
            nodePackages.yarn
            nodejs

            # Rust
            rustToolchain
          ] 
          ++ (if pkgs.stdenv.isDarwin then darwinFrameworks else linuxLibraries);

          # SHELL HOOK: Sets up the environment variables automatically
          shellHook = if pkgs.stdenv.isDarwin then "" else ''
            # Critical for Linux/NixOS: Helps the binary find the .so libraries
            export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath linuxLibraries}:$LD_LIBRARY_PATH
            
            # Fixes for GTK file dialogs and themes
            export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS
            
            echo "🚀 Tauri Dev Environment Loaded (Rust Stable)"
          '';
        };
      }
    );
}