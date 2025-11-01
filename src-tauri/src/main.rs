#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Manager, WindowEvent, menu::{Menu, MenuItem, PredefinedMenuItem}, tray::{TrayIconBuilder, TrayIconEvent}};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

fn main() {

    let custom_ui_injector_js = r#"
    // Custom title bar and UI elements
    setTimeout(() => {
        try {
            // Create custom title bar elements
            const createTitleBarElements = () => {
                // Check if title bar already exists
                if (document.getElementById('tatar-title-bar')) return;
                
                const titleBar = document.createElement('div');
                titleBar.id = 'tatar-title-bar';
                titleBar.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 30px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 10px;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 12px;
                    user-select: none;
                    -webkit-app-region: drag;
                `;
                
                // Left side - App info
                const leftSide = document.createElement('div');
                leftSide.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                
                const appIcon = document.createElement('span');
                appIcon.innerHTML = '🎵';
                appIcon.style.cssText = `
                    font-size: 14px;
                `;
                
                const appTitle = document.createElement('span');
                appTitle.textContent = 'Tatar - YouTube Music';
                appTitle.style.cssText = `
                    font-weight: 500;
                `;
                
                leftSide.appendChild(appIcon);
                leftSide.appendChild(appTitle);
                
                // Center - Controls
                const centerControls = document.createElement('div');
                centerControls.style.cssText = `
                    display: flex;
                    gap: 8px;
                    -webkit-app-region: no-drag;
                `;
                
                const settingsBtn = document.createElement('button');
                settingsBtn.id = 'tatar-settings-btn';
                settingsBtn.innerHTML = '⚙️';
                settingsBtn.title = 'Settings';
                settingsBtn.style.cssText = `
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background 0.2s;
                `;
                settingsBtn.addEventListener('click', () => {
                    window.dispatchEvent(new Event('open-settings'));
                });
                settingsBtn.addEventListener('mouseenter', () => {
                    settingsBtn.style.background = 'rgba(255,255,255,0.3)';
                });
                settingsBtn.addEventListener('mouseleave', () => {
                    settingsBtn.style.background = 'rgba(255,255,255,0.2)';
                });
                
                const minimizeBtn = document.createElement('button');
                minimizeBtn.innerHTML = '−';
                minimizeBtn.title = 'Minimize';
                minimizeBtn.style.cssText = `
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.2s;
                    -webkit-app-region: no-drag;
                `;
                minimizeBtn.addEventListener('click', () => {
                    window.__TAURI__.window.getCurrentWindow().minimize();
                });
                minimizeBtn.addEventListener('mouseenter', () => {
                    minimizeBtn.style.background = 'rgba(255,255,255,0.3)';
                });
                minimizeBtn.addEventListener('mouseleave', () => {
                    minimizeBtn.style.background = 'rgba(255,255,255,0.2)';
                });
                
                centerControls.appendChild(settingsBtn);
                centerControls.appendChild(minimizeBtn);
                
                // Right side - Window controls
                const rightControls = document.createElement('div');
                rightControls.style.cssText = `
                    display: flex;
                    gap: 4px;
                    -webkit-app-region: no-drag;
                `;
                
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '✕';
                closeBtn.title = 'Close';
                closeBtn.style.cssText = `
                    background: rgba(255,59,48,0.8);
                    border: none;
                    color: white;
                    width: 24px;
                    height: 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background 0.2s;
                `;
                closeBtn.addEventListener('click', () => {
                    window.__TAURI__.window.getCurrentWindow().hide();
                });
                closeBtn.addEventListener('mouseenter', () => {
                    closeBtn.style.background = 'rgba(255,59,48,1)';
                });
                closeBtn.addEventListener('mouseleave', () => {
                    closeBtn.style.background = 'rgba(255,59,48,0.8)';
                });
                
                rightControls.appendChild(closeBtn);
                
                titleBar.appendChild(leftSide);
                titleBar.appendChild(centerControls);
                titleBar.appendChild(rightControls);
                
                // Add to page
                document.body.insertBefore(titleBar, document.body.firstChild);
                
                // Adjust body padding to account for title bar
                document.body.style.paddingTop = '30px';
            };
            
            // Also inject settings button in YouTube's nav bar as fallback
            const injectSettingsButton = () => {
                const open_settings = new Event('open-settings');
                let top_bar = document.querySelector('.center-content.style-scope.ytmusic-nav-bar');
                if (top_bar && !document.getElementById('tatar-settings-btn-nav')) {
                    let settings_button = document.createElement('button');
                    settings_button.id = 'tatar-settings-btn-nav';
                    settings_button.innerHTML = '⚙️ Tatar Settings';
                    settings_button.style.cssText = `
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 20px;
                        margin-right: 10px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: transform 0.2s, box-shadow 0.2s;
                    `;
                    settings_button.addEventListener('click', (event) => {
                        window.dispatchEvent(open_settings);
                    });
                    settings_button.addEventListener('mouseenter', () => {
                        settings_button.style.transform = 'scale(1.05)';
                        settings_button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                    });
                    settings_button.addEventListener('mouseleave', () => {
                        settings_button.style.transform = 'scale(1)';
                        settings_button.style.boxShadow = 'none';
                    });
                    top_bar.prepend(settings_button);
                }
            };
            
            createTitleBarElements();
            injectSettingsButton();
            
            // Retry if YouTube Music hasn't loaded yet
            if (!document.querySelector('.center-content.style-scope.ytmusic-nav-bar')) {
                setTimeout(injectSettingsButton, 2000);
            }
            
        } catch (e) {
            console.log('Tatar: Could not inject custom UI elements', e);
        }
    }, 1000);
    "#;

    tauri::Builder::default()
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();
            window.eval(custom_ui_injector_js).unwrap();
            
            // Enhanced system tray menu
            let show = MenuItem::new(app, "Show", true, None::<String>)?;
            let hide = MenuItem::new(app, "Hide", true, None::<String>)?;
            let separator1 = PredefinedMenuItem::separator(app)?;
            let settings = MenuItem::new(app, "Settings", true, None::<String>)?;
            let about = MenuItem::new(app, "About", true, None::<String>)?;
            let separator2 = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::new(app, "Quit", true, None::<String>)?;
            
            let menu = Menu::with_items(app, &[&show, &hide, &separator1, &settings, &about, &separator2, &quit])?;
                
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Tatar - YouTube Music")
                .show_menu_on_left_click(false)
                .build(app)?;
                
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .on_tray_icon_event(|app, event| match event {
            TrayIconEvent::Click { id, .. } => {
                match id.0.as_str() {
                    "Show" => {
                        let window = app.get_webview_window("main").unwrap();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    "Hide" => {
                        let window = app.get_webview_window("main").unwrap();
                        let _ = window.hide();
                    }
                    "Settings" => {
                        let settings_window = app.get_webview_window("settings");
                        match settings_window {
                            Some(window) => {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            None => {
                                let _ = tauri::WebviewWindowBuilder::new(
                                    app,
                                    "settings",
                                    tauri::WebviewUrl::App("/settings".into())
                                )
                                .title("Settings")
                                .inner_size(800.0, 600.0)
                                .resizable(false)
                                .center()
                                .build();
                            }
                        }
                    }
                    "About" => {
                        let window = app.get_webview_window("main").unwrap();
                        let _ = window.eval("alert('Tatar - YouTube Music Desktop App\\nVersion: 0.0.2\\nA lightweight YouTube Music desktop client');");
                    }
                    "Quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            },
            TrayIconEvent::DoubleClick { .. } => {
                let window = app.get_webview_window("main").unwrap();
                let _ = window.show();
                let _ = window.set_focus();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("failed to run Tauri application");
}
