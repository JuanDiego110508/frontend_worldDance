import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Discipline {
  tag: string;
  counter: string;
  icon: SafeHtml;
  title: string;
  desc: string;
  sub: string;
  system: string;
  accent: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  disciplinesData: Discipline[] = [
    {
      tag: 'Técnica Académica',
      counter: '01 / 06',
      icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>',
      title: 'Clásico',
      desc: 'Repertorio tradicional, variaciones clásicas y trabajo de puntas. Criterios rigurosos de alineación, rotación, en-dehors y musicalidad.',
      sub: 'Solo, Dúo, Grupo',
      system: 'Criterio Vaganova / RAD',
      accent: 'dancePurple'
    },
    {
      tag: 'Expresión Escénica',
      counter: '02 / 06',
      icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>',
      title: 'Contemporáneo',
      desc: 'Técnica Graham, Release, Contact Improvisation y Fusión Contemporánea. Puntuación de proyección dramática, control de peso y balance.',
      sub: 'Solo, Dúo, Grupo',
      system: 'Puntaje Artístico',
      accent: 'danceCyan'
    },
    {
      tag: 'Tradición y Cultura',
      counter: '03 / 06',
      icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>',
      title: 'Folclor',
      desc: 'Expresión y representación de danzas tradicionales y folclóricas. Se evalúa el respeto por la raíz, la vestimenta y la identidad regional.',
      sub: 'Solo, Dúo, Grupo',
      system: 'Arbitraje Tradicional',
      accent: 'pink'
    },
    {
      tag: 'Batallas & Crews',
      counter: '04 / 06',
      icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>',
      title: 'Urbano',
      desc: 'Breaking, Hip-Hop, Popping, Locking y Street Styles. Arbitraje enfocado en musicalidad, fluidez, limpieza de ejecución y freestyle.',
      sub: 'Solo, Dúo, Grupo',
      system: 'WDSF System',
      accent: 'dancePurple'
    },
    {
      tag: 'Elegancia Deportiva',
      counter: '05 / 06',
      icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
      title: 'Baile de Salón',
      desc: 'Standard Ballroom: Vals Vienés, Tango, Pasodoble. Sistema de marcas de patinaje (Skating System) integrado para evaluación técnica.',
      sub: 'Solo, Dúo, Grupo',
      system: 'WDSF World Standard',
      accent: 'danceCyan'
    },
    {
      tag: 'Ritmos y Sabor',
      counter: '06 / 06',
      icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"></path></svg>',
      title: 'Latino',
      desc: 'Salsa, Bachata, Merengue y Latin Ballroom. Evaluación reglamentada de destrezas, velocidad, compás rítmico y cargadas escénicas.',
      sub: 'Solo, Dúo, Grupo',
      system: 'Arbitraje Rítmico',
      accent: 'pink'
    }
  ];

  private sanitizer = inject(DomSanitizer);

  constructor() {
    this.disciplinesData = this.disciplinesData.map(d => ({
      ...d,
      icon: this.sanitizer.bypassSecurityTrustHtml(d.icon as string)
    }));
  }

  currentIndex = signal(0);
  autoplayInterval: any;

  visibleItems = computed(() => {
    const arr = [];
    const idx = this.currentIndex();
    for (let i = 0; i < 3; i++) {
      arr.push(this.disciplinesData[(idx + i) % this.disciplinesData.length]);
    }
    return arr;
  });

  ngOnInit() {
    this.startAutoplay();
  }

  ngOnDestroy() {
    this.stopAutoplay();
  }

  nextSlide() {
    this.currentIndex.set((this.currentIndex() + 1) % this.disciplinesData.length);
  }

  prevSlide() {
    this.currentIndex.set((this.currentIndex() - 1 + this.disciplinesData.length) % this.disciplinesData.length);
  }

  setSlide(index: number) {
    this.currentIndex.set(index);
  }

  startAutoplay() {
    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
  }

  getAccentClasses(accent: string) {
    if (accent === 'pink') {
      return 'text-dancePink-500 bg-dancePink-500/20 border-dancePink-500/30';
    } else if (accent === 'danceCyan') {
      return 'text-danceCyan-400 bg-danceCyan-500/20 border-danceCyan-500/30';
    } else {
      return 'text-dancePurple-light bg-dancePurple-500/20 border-dancePurple-500/30';
    }
  }
}