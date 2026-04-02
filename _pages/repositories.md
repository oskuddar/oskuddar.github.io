---
layout: page
permalink: /repositories/
title: GitHub
description:
nav: true
nav_order: 3
---

<style>
  .repo-circle-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
    justify-content: center;
    align-items: center;
    margin-top: 2rem;
  }

  .repo-circle-link {
    text-decoration: none;
  }

  .repo-circle-shape {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 1.5rem;
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 1.4;
    color: #fff;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  }

  .repo-circle-link:hover .repo-circle-shape {
    transform: translateY(-4px) scale(1.03);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
  }

  .repo-trnl {
    background: linear-gradient(135deg, #1b7f5a, #2ea36f);
  }

  .repo-dna {
    background: linear-gradient(135deg, #355cbb, #5b8def);
  }

  @media (max-width: 768px) {
    .repo-circle-shape {
      width: 180px;
      height: 180px;
      font-size: 1rem;
    }
  }
</style>

## Repositories

<div class="repo-circle-wrapper">
  <a class="repo-circle-link" href="https://github.com/oskuddar/trnL_DB" target="_blank" rel="noopener noreferrer">
    <div class="repo-circle-shape repo-trnl">
    <i>trnL</i>&nbsp;Database
    </div>
  </a>

  <a class="repo-circle-link" href="https://github.com/oskuddar/DNA_metabarcoding" target="_blank" rel="noopener noreferrer">
    <div class="repo-circle-shape repo-dna">
      DNA metabarcoding
    </div>
  </a>
</div>