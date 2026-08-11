---
layout: page
title: Home
---

<div class="row justify-content-center">
  <div class="col-12 col-lg-10 col-xl-8">
    <div class="card shadow-sm border-0">
      <div class="card-body p-4 p-md-5">
        <span class="badge text-bg-primary mb-3">Welcome</span>
        <h1 class="display-6 fw-bold mb-3">{{ site.title }}</h1>
        <p class="lead text-body-secondary mb-4">{{ site.description }}</p>

        <h2 class="h5 fw-semibold mb-3">Latest Posts</h2>
        <ul class="list-unstyled">
          {% for post in site.posts limit:5 %}
          <li class="mb-2">
            <a class="text-decoration-none" href="{{ post.url | relative_url }}">{{ post.title }}</a>
            <span class="text-body-secondary small">— {{ post.date | date: "%B %d, %Y" }}</span>
          </li>
          {% endfor %}
        </ul>
      </div>
    </div>
  </div>
</div>