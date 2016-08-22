"use strict";

var createGame = function() {
    var game = {
        level: parseInt(localStorage.getItem("securepanel.level")) || 1,
        
        init: function() {
            // Cleanup previous game / round.
            game.cleanup();
            
            game.setupField();
            game.createPlayer();
            game.addHandlers();
            
            // Click the boss (first enemy) by default to target it.
            $("#field td").find(".enemy")[0].click();
        },
        cleanup: function() {
            // Stop any animations in progress from previous game / round.
            $("*").stop(true);
            
            // Stop ticks on previous player & enemies.
            if(game.player) { game.player.alive = false; }
            if(game.enemies) { $.each(game.enemies, function(idx, e) { e.alive = false; }); }
        },
        setupField: function() {
            // Clear field.
            $("#field").empty();
            
            // Get support enemies.
            var supportCount = game.level - 1;
            var rowheight = supportCount > 0 ? "80%" : "100%";
            var colspan = supportCount > 0 ? supportCount : 1;
            
            var html = "<tr style='height: " + rowheight + ";'><td colspan='" + colspan + "'></td></tr>";
            if(supportCount > 0) {
                html += "<tr>";
                for(var a = 0; a < supportCount; a++) {
                    html += "<td></td>";
                }
                html += "</tr>";
            }
            
            $("#field").append(html);
            
            // Create enemies.
            game.createEnemies();
        },
        createEnemies: function() {
            // Clear field slots.
            $("#field td").empty();
            game.enemies = [];
            
            $("#field td").each(function(idx, td) {
                // Determine class.
                var boss = false;
                var title = "";
                var tag = "";
                var hpColor = "unknown";
                var minHealth = 1;
                var maxHealth = 1;
                var spellbook = [];
                
                if(idx === 0) {
                    // Boss.
                    boss = true;
                    title = "<tr><td><div class='enemyTitle'>Secure Panel: Level " + game.level + "</div></td></tr>";
                    tag = "boss";
                    hpColor = "bossColor";
                    minHealth = 50;
                    maxHealth = 60;
                    spellbook = [game.spells.dmg.hit, game.spells.dmg.slam];
                } else {
                    // Random support class.
                    var r = Math.random();
                    
                    if(r > .3) {
                        // Tank.
                        tag = "support";
                        hpColor = "tankColor";
                        minHealth = 10;
                        maxHealth = 15;
                        spellbook = [game.spells.dmg.hit, game.spells.dmg.slam];
                    } else {
                        // Healer.
                        tag = "support";
                        hpColor = "healerColor";
                        minHealth = 5;
                        maxHealth = 10;
                        spellbook = [game.spells.heal.minor, game.spells.heal.big, game.spells.dmg.hit];
                    }
                }
                
                var startHealth = (Math.random() * (maxHealth - minHealth)) + minHealth;
                var health = startHealth;
                
                // Create DOM object.
                var html = "<table class='enemy " + tag + "' cellspacing='0' cellpadding='0' border='0'>" + title + "<tr style='height: 75%;'><td><div class='enemyHealthbar " + hpColor + "'></div></td></tr><tr><td><div class='enemyCastbar'></div></td></tr></table>";
                $(td).append(html);
                
                // Create logic object.
                var e = {
                    index: idx,
                    tickTime: 1000,
                    boss: boss,
                    alive: true,
                    casting: false,
                    recovering: false,
                    init: function() {
                        // Start ticks.
                        setTimeout(e.tick, e.tickTime);
                    },
                    tick: function() {
                        if(!e.alive || !game.player.alive) {
                            return;
                        }
                        
                        // Chance to cast.
                        if(Math.random() < .3) { e.startCast(); }
                        
                        setTimeout(e.tick, e.tickTime);
                    },
                    addHealth: function(h) {
                        if(!e.alive) {
                            return;
                        }
                        
                        health += h;
                        
                        if(health > startHealth) {
                            health = startHealth;
                        } else if(health < 0) {
                            health = 0;
                            e.die();
                        }
                        
                        // Animate.
                        if(h > 0) { $(td).effect("highlight", {color: "#00FF00"}, 500); }
                        
                        // Update health indicator.
                        var w = (health / startHealth) * 100;
                        
                        $(td).find(".enemyHealthbar").css("width", w + "%");
                    },
                    damage: function(d) {
                        e.addHealth(-d);
                    },
                    startCast: function() {
                        if(e.casting || e.recovering) { return; }
                        
                        // Set friend and enemy.
                        e.friend = $(".boss").parent("td").data("enemy");
                        e.enemy = game.player;
                        
                        e.casting = true;
                        
                        // Determine spell to cast.
                        var spell = e.selectSpell();
                        
                        // Start cast.
                        $(td).find(".enemyCastbar").animate({width: "0%"}, spell.delay, function() {
                            // Cast done.
                            e.casting = false;
                            
                            // Apply spell.
                            spell.apply(e);
                            
                            // Start cast recovery.
                            e.recover(spell.recovery);
                        });
                    },
                    recover: function(recoverTime) {
                        if(e.recovering) { return; }
                        
                        e.recovering = true;
                        
                        // Start recovery after a delay.
                        
                        setTimeout(function() {
                            $(td).find(".enemyCastbar").animate({width: "100%"}, recoverTime, function() {
                                // Recover complete.
                                e.recovering = false;
                            });
                        }, 100);
                    },
                    interrupt: function() {
                        if(!e.casting || e.recovering) { return; }
                        
                        e.casting = false;
                        
                        // Highlight.
                        $(td).effect("highlight", { color: "#FF0000" }, 500);
                        
                        // Stop cast and recover.
                        $(td).find(".enemyCastbar").stop();
                        e.recover(1000);
                    },
                    selectSpell: function() {
                        return spellbook[Math.floor(Math.random() * spellbook.length)];
                    },
                    needsHealth: function() {
                        return e.alive && (health / startHealth) < .8 ? true : false;
                    },
                    targeted: function() {
                        e.interrupt();
                    },
                    die: function() {
                        if(!e.alive) { return; }
                        
                        e.alive = false;
                        
                        $(td).empty();
                        $(td).removeClass("target");
                        $(td).append("<div class='dead'></div>");
                        
                        if(e.boss) {
                            game.win();
                        } else {
                            // Target the boss.
                            $("#field td").find(".enemy")[0].click();
                        }
                    }
                };
                
                $(td).data("enemy", e);
                game.enemies.push(e);
                
                e.init();
            });
        },
        createPlayer: function() {
            var health = 10;
            var startHealth = health;
            var regenPerTick = .1;
            
            var p = {
                tickTime: 1000,
                alive: true,
                init: function() {
                    // Reset indicators.
                    $("#playerHealthbar").css("width", "100%");
                    $("#playerManabar").css("width", "100%");
                    
                    // Start ticks.
                    setTimeout(p.tick, p.tickTime);
                },
                tick: function() {
                    if(!p.alive) {
                        return;
                    }
                    
                    p.regenerate();
                    
                    setTimeout(p.tick, p.tickTime);
                },
                regenerate: function() {
                    p.addHealth(regenPerTick);
                },
                addHealth: function(h) {
                    if(!p.alive) {
                        return;
                    }
                    
                    health += h;
                    
                    if(health > startHealth) {
                        health = startHealth;
                    } else if(health < 0) {
                        health = 0;
                        p.die();
                    }
                    
                    // Update health indicator.
                    var w = (health / startHealth) * 100;
                    
                    $("#playerHealthbar").css("width", w + "%");
                },
                damage: function(d) {
                    p.addHealth(-d);
                },
                checkTarget: function() {
                    // Find target.
                    var e = $(".target").data("enemy");
                    if(!e || !e.alive) { return; }
                    
                    game.spells.dmg.e_hit.apply(e);
                },
                startCast: function(spell) {
                    if(p.casting || p.recovering || !p.alive) { return; }
                    
                    // Set friend and enemy.
                    p.friend = p;
                    p.enemy = $(".target").data("enemy");
                    
                    if(!p.enemy || !p.enemy.alive) { return; }
                    
                    p.casting = true;
                    
                    // Start cast.
                    $("#playerManabar").animate({width: "0%"}, spell.delay, function() {
                        // Cast done.
                        p.casting = false;
                        
                        // Apply spell.
                        spell.apply(p);
                        
                        // Start cast recovery.
                        p.recover(spell.recovery);
                    });
                },
                recover: function(recoverTime) {
                    if(p.recovering) { return; }
                    
                    p.recovering = true;
                    
                    // Start recovery after a delay.
                    recoverTime = 0;
                    setTimeout(function() {
                        $("#playerManabar").animate({width: "100%"}, recoverTime, function() {
                            // Recover complete.
                            p.recovering = false;
                        });
                    }, 0);
                },
                die: function() {
                    if(!p.alive) { return; }
                    
                    p.alive = false;
                    
                    game.lose();
                }
            };
            
            p.init();
            
            game.player = p;
        },
        playLevel: function() {
            $("#nextLevelScreen .title").text("Level " + game.level + " Security Panel");
            
            $("#nextLevelScreen").fadeIn(500, function() {
                // Wait, then fade in game window.
                setTimeout(function() {
                    $("#nextLevelScreen").fadeOut(2000, function() {
                        game.init();
                        $("#gameWindow").fadeIn();
                    });
                }, 1000);
            });
        },
        win: function() {
            game.cleanup();
            
            // Game over. Player wins, save win time.
            localStorage.setItem("securepanel.opened", new Date().toLocaleString());
            
            // Show win screen.
            $("#gameWindow").fadeOut(500, function() {
                $("#winScreen").fadeIn(500);
            });
        },
        lose: function() {
            game.cleanup();
            
            // Update failed attempts.
            var failedAttempts = parseInt(localStorage.getItem("securepanel.failedAttempts"), 10) || 0;
            failedAttempts++;
            localStorage.setItem("securepanel.failedAttempts", failedAttempts);
            
            $("#gameWindow").fadeOut(500, function() {
                $("#loseScreen").fadeIn(500);
            });
        },
        addHandlers: function() {
            // Enemy click handler.
            $("#field td").find(".enemy").click(function() {
                $("#field td").removeClass("target");
                
                var td = $(this).parent("td");
                var e = td.data("enemy");
                if(!e) { return; }
                
                $(td).addClass("target");
                e.targeted();
            });
        },
        updateDescriptions: function() {
            // Update security level description.
            var level = game.level;
            $("#splashScreen .content .title").text("Level " + level + " Security Panel");
            
            // Update unauthorized access attempts.
            var failedAttempts = parseInt(localStorage.getItem("securepanel.failedAttempts"), 10) || 0;
            $("#splashScreen .content .attempts").text("Unauthorized access attempts: " + failedAttempts);
            
            // Update last win time indicators.
            var ts = localStorage.getItem("securepanel.opened");
            if(ts) {
                $("#splashScreen .content .statusbar").text("Security panel last opened: " + ts);
                
                $("#nuclearImpactScreen .content .title").text("Level " + level + " Security Panel Breached");
                $("#nuclearImpactScreen .content .statusbar").text("Nuclear launch on: " + ts);
            } else {
                $("#splashScreen .content .statusbar").text("Security panel last opened: Unknown");
            }
        },
        spells: {
            heal: {
                minor: {
                    delay: 500,
                    recovery: 500,
                    minAmount: 2,
                    maxAmount: 5,
                    apply: function(caster) {
                        var a = (Math.random() * (this.maxAmount - this.minAmount)) + this.minAmount;
                        caster.friend.addHealth(a);
                    }
                },
                big: {
                    delay: 1000,
                    recovery: 1000,
                    minAmount: 5,
                    maxAmount: 10,
                    apply: function(caster) {
                        var a = (Math.random() * (this.maxAmount - this.minAmount)) + this.minAmount;
                        caster.friend.addHealth(a);
                    }
                }
            },
            dmg: {
                hit: {
                    delay: 500,
                    recovery: 500,
                    minAmount: 3,
                    maxAmount: 5,
                    apply: function(caster) {
                        var a = (Math.random() * (this.maxAmount - this.minAmount)) + this.minAmount;
                        caster.enemy.damage(a);
                    }
                },
                slam: {
                    delay: 1000,
                    recovery: 1000,
                    minAmount: 7,
                    maxAmount: 10,
                    apply: function(caster) {
                        var a = (Math.random() * (this.maxAmount - this.minAmount)) + this.minAmount;
                        caster.enemy.damage(a);
                    }
                }
            }
        }
    }
    
    return game;
};

// Button hover handlers.
$(".button").hover(function() {
    // Hover over.
    $(this).removeClass("buttonbutton");
    $(this).addClass("button_hover");
},
function() {
    // Hover off.
    $(this).removeClass("button_hover");
    $(this).addClass("button");
});

$(".spellbutton").hover(function() {
    // Hover over.
    $(this).removeClass("spellbuttonbutton");
    $(this).addClass("spellbutton_hover");
},
function() {
    // Hover off.
    $(this).removeClass("spellbutton_hover");
    $(this).addClass("spellbutton");
});

// Button click handlers.
$("#startButton").click(function() {
    $("#splashScreen").fadeOut(500, function() {
        game.playLevel();
    });
});

$("#launchNukeButton").click(function() {
    $("#winScreen").fadeOut(500, function() {
        $("#launchNukeScreen").fadeIn(500, function() {
            // Start nuclear impact timer.
            $("#nuclearImpactTimer").animate({width: "0%"}, 60000, function() {
                // Impact.
                localStorage.setItem("securepanel.nuked", "true");
                
                // Show final screen.
                $("#launchNukeScreen").fadeOut(500, function() {
                    game.updateDescriptions();
                    $("#nuclearImpactScreen").fadeIn(500);
                });
            });
        });
    });
});

$("#abortLaunchButton").click(function() {
    $("#launchNukeScreen .statusbar").text("Abort sequence failure. Please wait for impact confirmation.");
});

$("#skipLaunchNukeButton").click(function() {
    $("#winScreen").fadeOut(500, function() {
        // Permanently increase security level.
        game.level++;
        localStorage.setItem("securepanel.level", game.level);
        
        $("#skipLaunchNukeScreen").fadeIn(500);
    });
});

$("#skipLaunchOkayButton").click(function() {
    $("#skipLaunchNukeScreen").fadeOut(500, function() {
        game.updateDescriptions();
        
        $("#splashScreen").fadeIn(500);
    });
});

$("#loseOkayButton").click(function() {
    $("#loseScreen").fadeOut(500, function() {
        game.updateDescriptions();
        
        $("#splashScreen").fadeIn(500);
    });
});

$("#spellHeal").click(function() {
    game.player.startCast(game.spells.heal.minor);
});

$("#spellHit").click(function() {
    game.player.startCast(game.spells.dmg.hit);
});

$("#spellSlam").click(function() {
    game.player.startCast(game.spells.dmg.slam);
});

// Initialize.
var game = createGame();

// Show splash screen or final screen.
game.updateDescriptions();
if(localStorage.getItem("securepanel.nuked")) {
    $("#nuclearImpactScreen").fadeIn(500);
} else {
    $("#splashScreen").fadeIn(500);
}