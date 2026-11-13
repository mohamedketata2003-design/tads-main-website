/* === CLASS & ID MAPPING (DO NOT REMOVE) === */

// map slides
document.querySelectorAll(".carousel-item").forEach(el => {
    el.classList.add("slide");
});

// map active class
document.querySelectorAll(".is-active").forEach(el => {
    el.classList.add("active");
});

// map dots container
const indicators = document.getElementById("carouselIndicators");
if (indicators) indicators.id = "sliderDots";

// map arrows
const prev = document.getElementById("carouselPrev");
if (prev) prev.id = "prevSlide";

const next = document.getElementById("carouselNext");
if (next) next.id = "nextSlide";


const slides = document.querySelectorAll(".slide");
const dotsContainer = document.getElementById("sliderDots");
const prevBtn = document.getElementById("prevSlide");
const nextBtn = document.getElementById("nextSlide");


let current = 0;

/* CREATE DOTS */
slides.forEach((_, i) => {
    const dot = document.createElement("button");
    if (i === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goToSlide(i));
    dotsContainer.appendChild(dot);
});

let dots = dotsContainer.querySelectorAll("button");

function goToSlide(i) {
    slides[current].classList.remove("active");
    dots[current].classList.remove("active");

    current = (i + slides.length) % slides.length;

    slides[current].classList.add("active");
    dots[current].classList.add("active");
}

/* ARROWS */
nextBtn.addEventListener("click", () => goToSlide(current + 1));
prevBtn.addEventListener("click", () => goToSlide(current - 1));

/* AUTOPLAY */
setInterval(() => goToSlide(current + 1), 5000);

