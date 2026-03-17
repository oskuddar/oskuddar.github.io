---
layout: page
permalink: /mentoring/
title: mentoring
description: "<h3>Mentees</h3>"
show_title: false
nav: true
nav_order: 6
students:
  - name: Rasaq Awosemo (2025 - Present)
    role: Ph.D. student
    topic: Academic mentorship — Provided guidance on graduate school preparation, research direction, and career development.
    result: Outcome — Rasaq joined the Callahan Lab as a Ph.D. student.
---

{% for student_item in page.students %}
<div class="card mt-3 p-3">
  <h3>{{ student_item.name }}</h3>
  <p>{{ student_item.role }}</p>
  <p>{{ student_item.topic }}</p>
  <p>{{ student_item.result }}</p>
</div>
{% endfor %}
---
