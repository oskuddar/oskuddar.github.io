---
layout: page
permalink: /roles/
title: roles
show_title: false
description:
nav: true
nav_order: 3

classes:
  - name: "MB588 – Microbiome Analysis, <i>Lecturer: Dr. C. Hawkes</i>"
    role: "Teaching Assistant (TA)"
    recitation: "<u>Recitation Lectures</u>: Large Language Models (LLM) and Coding; Measurement Bias in Marker Gene Sequencing"
    contributions_title: "Teaching Contributions:"
    done:
      - Reviewed assignments and final projects.
      - Mentored graduate students without computational backgrounds in applying bioinformatics pipelines and interpreting microbiome analysis results.

students:
  - name: Rasaq Awosemo (2025 - Present)
    role: Bioinformatics Ph.D. student
    topic: "<u>Academic mentorship:</u> Provided guidance on navigating Ph.D. program requirements, research direction, and career development."
    result: "<u>Outcome:</u> Rasaq joined the Callahan Lab as a Ph.D. student."
---

<h3><strong>Teaching</strong></h3>

{% for class_entry in page.classes %}
<div class="card mt-3 p-3">
  <h3>{{ class_entry.name }}</h3>
  {{ class_entry.role | markdownify }}
  <p>{{ class_entry.recitation }}</p>
  <u>{{ class_entry.contributions_title }}</u>
  <ul>
    {% for teaching_item in class_entry.done %}
    <li>{{ teaching_item }}</li>
    {% endfor %}
  </ul>
</div>
{% endfor %}

<br>

<h3><strong>Mentorship</strong></h3>

{% for student_item in page.students %}
<div class="card mt-3 p-3">
  <h3>{{ student_item.name }}</h3>
  <p>{{ student_item.role }}</p>
  <p>{{ student_item.topic }}</p>
  <p>{{ student_item.result }}</p>
</div>
{% endfor %}
