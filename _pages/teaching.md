---
layout: page
permalink: /teaching/
title: teaching
show_title: false
description:
nav: true
nav_order: 6
classes:
  - name: "MB588 – Microbiome Analysis, *Lecturer: Dr. C. Hawkes*"
    role: "Teaching Assistant (TA)"
    recitation: "<u>Recitation Lectures</u>: Large Language Models and Coding; Measurement Bias in Marker Gene Sequencing"    
    contributions_title: "Teaching Contributions:"
    done:
      - Reviewed assignments and final projects.
      - Mentored graduate students without computational backgrounds in applying bioinformatics pipelines and interpreting microbiome analysis results.
---

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