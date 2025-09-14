---
layout: terminal
title: "Robbie Rao Fenggui"
description: "Interdisciplinary design researcher bridging art, technology, and human-centered innovation."
---

<div class="container">
  <img src="/images/profile.png" alt="Profile photo" class="profile" loading="lazy" width="855" height="863">
  <h1>Robbie Rao Fenggui</h1>
  <p class="tagline">Interdisciplinary design researcher bridging art, technology, and human-centered innovation.</p>
  <div class="tags">
    <button data-cmd="open contact" data-key="contact">Contact</button>
    <button data-cmd="open links" data-key="links">Links</button>
    <button data-cmd="open education" data-key="education">Education</button>
    <button data-cmd="open publications" data-key="publications">Publications</button>
    <button data-cmd="open patents" data-key="patents">Patents</button>
    <button data-cmd="open award" data-key="award">Award</button>
    <button data-cmd="open projects" data-key="projects">Projects</button>
    <button data-cmd="open experience" data-key="experience">Experience</button>
  </div>
  <div class="terminal-window">
    <div class="terminal-bar">
      <span class="dot red"></span>
      <span class="dot yellow"></span>
      <span class="dot green"></span>
    </div>
    <div id="terminal"></div>
    <input type="text" id="terminal-input" placeholder="Type a command...">
  </div>
</div>
<script>
  const profileData = {{ site.data.profile | jsonify }};
</script>
