---
layout: page
permalink: /mentoring/
title: mentoring
description:
nav: true
nav_order: 6
students:
  - name: Student Name 1
    role: Undergraduate student
    topic: Project/topic
  - name: Student Name 2
    role: Graduate student
    topic: Project/topic
---

{% for student_item in page.students %}
<div class="card mt-3 p-3">
  <h3>{{ student_item.name }}</h3>
  <p>{{ student_item.role }}</p>
  <p>{{ student_item.topic }}</p>
</div>
{% endfor %}