---
layout: page
permalink: /teaching/
title: teaching
description:
nav: true
nav_order: 6
calendar: false
classes:
  - name: MB588 – Microbiome Analysis
    role: Teaching Assistant (TA)
    lecturer: Dr. C. Hawkes
    recitation: "Recitation Lectures: Large Language Models and Coding; Measurement Bias in Marker Gene Sequencing"
    done:
      - Reviewed assignments and final projects.
      - Guided non-computational graduate students in applying bioinformatics pipelines and interpreting statistical results in microbiome analyses.
---

{% for class_entry in page.classes %}
<div class="card mt-3 p-3">
  <h3>{{ class_entry.name }}</h3>
  <p>{{ class_entry.role }}</p>
  <p>{{ class_entry.lecturer }}</p>
  <p>{{ class_entry.recitation }}</p>
  <ul>
    {% for teaching_item in class_entry.done %}
    <li>{{ teaching_item }}</li>
    {% endfor %}
  </ul>
</div>
{% endfor %}

{% include calendar.liquid calendar_id='test@gmail.com' timezone='America/New_York' %}
