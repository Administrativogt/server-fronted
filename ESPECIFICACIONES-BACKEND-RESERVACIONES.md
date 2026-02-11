# 📋 Especificaciones Backend - Módulo de Reservación de Salas

## 🎯 Resumen
Este documento detalla las implementaciones necesarias en el backend de NestJS para completar el módulo de reservaciones de salas.

---

## 1. 🔁 Reservaciones Recurrentes

### 1.1 Campos en el Modelo `Reservation`

Agregar los siguientes campos a la entidad de reservaciones:

```typescript
@Entity('reservations')
export class Reservation {
  // ... campos existentes ...

  @Column({ type: 'boolean', default: false, name: 'is_recurring' })
  isRecurring: boolean;

  @Column({ 
    type: 'enum', 
    enum: ['daily', 'weekly', 'biweekly', 'monthly'],
    nullable: true,
    name: 'recurrence_pattern'
  })
  recurrencePattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly';

  @Column({ type: 'date', nullable: true, name: 'recurrence_end_date' })
  recurrenceEndDate?: Date;

  @ManyToOne(() => Reservation, reservation => reservation.recurringInstances, { nullable: true })
  @JoinColumn({ name: 'parent_reservation_id' })
  parentReservation?: Reservation;

  @OneToMany(() => Reservation, reservation => reservation.parentReservation)
  recurringInstances?: Reservation[];
}
```

### 1.2 DTOs Actualizados

**CreateReservationDto:**

```typescript
export class CreateReservationDto {
  // ... campos existentes ...

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'biweekly', 'monthly'])
  @ValidateIf(o => o.isRecurring === true)
  recurrencePattern?: 'daily' | 'weekly' | 'biweekly' | 'monthly';

  @IsOptional()
  @IsDateString()
  @ValidateIf(o => o.isRecurring === true)
  recurrenceEndDate?: string;
}
```

### 1.3 Lógica de Creación de Reservaciones Recurrentes

**Servicio:** `ReservationsService`

```typescript
async createReservation(dto: CreateReservationDto, userId: number) {
  // 1. Validar disponibilidad de la primera fecha
  await this.validateAvailability(dto.roomId, dto.reservationDate, dto.initHour, dto.endHour);

  // 2. Crear la reservación principal
  const parentReservation = await this.reservationRepository.save({
    ...dto,
    requestUserId: userId,
    state: 0,
  });

  // 3. Si es recurrente, crear instancias hijas
  if (dto.isRecurring && dto.recurrencePattern && dto.recurrenceEndDate) {
    const result = await this.createRecurringInstances(parentReservation, dto);
    
    return {
      reservation: parentReservation,
      recurringInfo: {
        totalCreated: result.created.length,
        createdDates: result.created,
        failedDates: result.failed,
      }
    };
  }

  return { reservation: parentReservation };
}

private async createRecurringInstances(parent: Reservation, dto: CreateReservationDto) {
  const created: string[] = [];
  const failed: Array<{ date: string; reason: string }> = [];

  const startDate = new Date(dto.reservationDate);
  const endDate = new Date(dto.recurrenceEndDate);
  let currentDate = this.getNextDate(startDate, dto.recurrencePattern);

  while (currentDate <= endDate) {
    try {
      // Verificar disponibilidad
      const isAvailable = await this.checkAvailability(
        dto.roomId,
        currentDate,
        dto.initHour,
        dto.endHour
      );

      if (isAvailable) {
        await this.reservationRepository.save({
          ...dto,
          reservationDate: currentDate,
          parentReservationId: parent.id,
          isRecurring: true,
          recurrencePattern: dto.recurrencePattern,
        });
        created.push(currentDate.toISOString().split('T')[0]);
      } else {
        failed.push({
          date: currentDate.toISOString().split('T')[0],
          reason: 'Conflicto de horario',
        });
      }
    } catch (error) {
      failed.push({
        date: currentDate.toISOString().split('T')[0],
        reason: error.message,
      });
    }

    currentDate = this.getNextDate(currentDate, dto.recurrencePattern);
  }

  return { created, failed };
}

private getNextDate(date: Date, pattern: string): Date {
  const next = new Date(date);
  
  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }
  
  return next;
}
```

---

## 2. 📧 Sistema de Emails Automáticos

### 2.1 Configuración SMTP

**Variables de entorno (.env):**

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@empresa.com
SMTP_PASSWORD=tu-password-de-aplicacion
SMTP_FROM_NAME=Sistema de Reservaciones
SMTP_FROM_EMAIL=noreply@empresa.com
RECEPCIONIST_EMAIL=recepcion@empresa.com
```

### 2.2 Módulo de Email

```typescript
@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      defaults: {
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
})
export class EmailModule {}
```

### 2.3 Servicio de Emails

```typescript
@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendReservationCreated(reservation: Reservation, user: User) {
    const recipients = [user.email];
    
    // Si tiene participantes, agregarlos
    if (reservation.participantsEmails?.length) {
      recipients.push(...reservation.participantsEmails);
    }

    await this.mailerService.sendMail({
      to: recipients,
      subject: `Reservación de sala - ${reservation.room.name}`,
      template: './reservation-created',
      context: {
        userName: user.fullName,
        roomName: reservation.room.name,
        date: format(reservation.reservationDate, 'dd/MM/yyyy'),
        initHour: reservation.initHour,
        endHour: reservation.endHour,
        reason: reservation.reason,
      },
      attachments: [
        {
          filename: 'reservacion.ics',
          content: this.generateICS(reservation),
        },
      ],
    });
  }

  async sendReservationAccepted(reservation: Reservation) {
    const recipients = [reservation.user.email];
    if (reservation.requestUser) {
      recipients.push(reservation.requestUser.email);
    }

    await this.mailerService.sendMail({
      to: recipients,
      subject: 'Reservación aceptada',
      template: './reservation-accepted',
      context: {
        roomName: reservation.room.name,
        date: format(reservation.reservationDate, 'dd/MM/yyyy'),
        initHour: reservation.initHour,
        endHour: reservation.endHour,
      },
    });
  }

  async sendReservationRejected(reservation: Reservation, rejectReason: string) {
    const recipients = [reservation.user.email];
    if (reservation.requestUser) {
      recipients.push(reservation.requestUser.email);
    }

    await this.mailerService.sendMail({
      to: recipients,
      subject: 'Reservación rechazada',
      template: './reservation-rejected',
      context: {
        roomName: reservation.room.name,
        date: format(reservation.reservationDate, 'dd/MM/yyyy'),
        initHour: reservation.initHour,
        endHour: reservation.endHour,
        rejectReason,
      },
    });
  }

  async sendReservationCanceled(reservation: Reservation, cancelReason?: string) {
    const recipients = [reservation.user.email];
    if (reservation.requestUser) {
      recipients.push(reservation.requestUser.email);
    }
    // Notificar a recepción
    recipients.push(process.env.RECEPCIONIST_EMAIL);

    await this.mailerService.sendMail({
      to: recipients,
      subject: 'Reservación cancelada',
      template: './reservation-canceled',
      context: {
        roomName: reservation.room.name,
        date: format(reservation.reservationDate, 'dd/MM/yyyy'),
        initHour: reservation.initHour,
        endHour: reservation.endHour,
        cancelReason,
      },
    });
  }

  private generateICS(reservation: Reservation): string {
    // Implementar generación de archivo ICS para Outlook/Calendar
    // Similar al código de Django usando icalendar
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Consortium Legal//Reservaciones//ES
BEGIN:VEVENT
UID:${reservation.id}@empresa.com
DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}
DTSTART:${format(reservation.reservationDate, 'yyyyMMdd')}T${reservation.initHour.replace(':', '')}00
DTEND:${format(reservation.reservationDate, 'yyyyMMdd')}T${reservation.endHour.replace(':', '')}00
SUMMARY:${reservation.reason}
LOCATION:${reservation.room.name}
DESCRIPTION:${reservation.reason}
END:VEVENT
END:VCALENDAR`;
  }
}
```

### 2.4 Templates de Email (Handlebars)

Crear en `/src/templates/`:

- `reservation-created.hbs`
- `reservation-accepted.hbs`
- `reservation-rejected.hbs`
- `reservation-canceled.hbs`
- `reservation-reminder.hbs`

**Ejemplo - reservation-created.hbs:**

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #003B5C; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f5f5f5; }
    .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #003B5C; }
    .footer { text-align: center; padding: 20px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reservación de Sala</h1>
    </div>
    <div class="content">
      <p>Hola {{userName}},</p>
      <p>Tu reservación ha sido creada exitosamente.</p>
      
      <div class="info-box">
        <p><strong>Sala:</strong> {{roomName}}</p>
        <p><strong>Fecha:</strong> {{date}}</p>
        <p><strong>Horario:</strong> {{initHour}} - {{endHour}}</p>
        <p><strong>Motivo:</strong> {{reason}}</p>
      </div>
      
      <p>Se adjunta un archivo ICS que puedes agregar a tu calendario.</p>
    </div>
    <div class="footer">
      <p>Sistema de Reservación de Salas - Consortium Legal</p>
    </div>
  </div>
</body>
</html>
```

---

## 3. 🔔 Sistema de Recordatorios Automáticos

### 3.1 Tarea Programada (Cron)

```typescript
@Injectable()
export class ReservationReminderService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private emailService: EmailService,
  ) {}

  @Cron('0 17 * * *') // Ejecutar todos los días a las 5 PM
  async sendDailyReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Si es viernes, enviar recordatorio para el lunes
    if (tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 2);
    }

    const reservations = await this.reservationRepository.find({
      where: {
        reservationDate: tomorrow,
        state: In([0, 1]), // Pendientes y aceptadas
        reminderSended: false,
      },
      relations: ['room', 'user', 'requestUser'],
    });

    if (reservations.length === 0) {
      return;
    }

    // Agrupar por sala
    const groupedByRoom = this.groupByRoom(reservations);

    // Enviar email consolidado
    await this.emailService.sendDailyReminder(groupedByRoom, tomorrow);

    // Marcar como enviados
    await this.reservationRepository.update(
      { id: In(reservations.map(r => r.id)) },
      { reminderSended: true }
    );
  }

  private groupByRoom(reservations: Reservation[]) {
    const grouped = {};
    
    reservations.forEach(r => {
      if (!grouped[r.room.name]) {
        grouped[r.room.name] = [];
      }
      grouped[r.room.name].push(r);
    });

    return grouped;
  }
}
```

---

## 4. ✅ Estado "Cancelada"

### 4.1 Actualizar Enum de Estado

```typescript
export enum ReservationState {
  PENDING = 0,
  ACCEPTED = 1,
  REJECTED = 2,
  CANCELED = 3,
}
```

### 4.2 Endpoint de Cancelación

```typescript
@Patch(':id/cancel')
@UseGuards(JwtAuthGuard)
async cancelReservation(
  @Param('id') id: number,
  @Body('cancel_reason') cancelReason: string,
  @Request() req,
) {
  const reservation = await this.reservationsService.findOne(id);
  
  // Verificar permisos: solo el dueño puede cancelar
  if (
    reservation.userId !== req.user.id &&
    reservation.requestUserId !== req.user.id
  ) {
    throw new ForbiddenException('No tienes permiso para cancelar esta reservación');
  }

  // Solo se puede cancelar si está pendiente o aceptada
  if (![0, 1].includes(reservation.state)) {
    throw new BadRequestException('Solo se pueden cancelar reservaciones pendientes o aceptadas');
  }

  const updated = await this.reservationsService.update(id, {
    state: 3,
    cancelReason,
  });

  // Enviar email de cancelación
  await this.emailService.sendReservationCanceled(updated, cancelReason);

  return updated;
}
```

---

## 5. 📦 Validación de Recursos (Cantidad)

### 5.1 Modelo de Recursos

```typescript
@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'int' })
  totalAmount: number;  // Cantidad total disponible
}

// Ejemplos:
// { name: 'Computadora', totalAmount: 2 }
// { name: 'Proyector', totalAmount: 2 }
// { name: 'Meeting Owl', totalAmount: 1 }
```

### 5.2 Endpoint de Validación

```typescript
@Get('resources/check-availability')
async checkResourceAvailability(
  @Query('date') date: string,
  @Query('initHour') initHour: string,
  @Query('endHour') endHour: string,
) {
  const resources = await this.resourcesService.findAll();
  const availability = {};

  for (const resource of resources) {
    const usedCount = await this.reservationsService.countResourceUsage(
      resource.id,
      date,
      initHour,
      endHour,
    );

    availability[resource.name] = {
      total: resource.totalAmount,
      used: usedCount,
      available: resource.totalAmount - usedCount,
      canReserve: usedCount < resource.totalAmount,
    };
  }

  return availability;
}
```

### 5.3 Validación en Creación

```typescript
async validateResourceAvailability(dto: CreateReservationDto) {
  const requestedResources = [];
  
  if (dto.useComputer) requestedResources.push('Computadora');
  if (dto.userProjector) requestedResources.push('Proyector');
  if (dto.useMeetingOwl) requestedResources.push('Meeting Owl');

  for (const resourceName of requestedResources) {
    const resource = await this.resourcesRepository.findOne({ where: { name: resourceName } });
    
    const usedCount = await this.countResourceUsage(
      resource.id,
      dto.reservationDate,
      dto.initHour,
      dto.endHour,
    );

    if (usedCount >= resource.totalAmount) {
      throw new BadRequestException(
        `El recurso "${resourceName}" no está disponible en ese horario (${usedCount}/${resource.totalAmount} en uso)`
      );
    }
  }
}
```

---

## 6. 📧 Campo Email en Room

### 6.1 Actualizar Entidad

```typescript
@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'price_per_hour' })
  pricePerHour?: number;

  @Column({ type: 'varchar', nullable: true, default: '' })
  email?: string;  // Email del encargado de la sala

  @Column({ type: 'boolean', default: true })
  state: boolean;
}
```

### 6.2 DTO Actualizado

```typescript
export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNumber()
  pricePerHour?: number;
}
```

---

## 7. 🔒 Permisos y Guards

### 7.1 Guard para Aprobación

```typescript
@Injectable()
export class CanApproveReservationsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Solo recepcionistas (permission_id = 7) o superusers
    return (
      user.permissions?.includes(7) || 
      user.isSuperuser
    );
  }
}
```

### 7.2 Guard para Compartir Costos

```typescript
@Injectable()
export class CanShareCostGuard implements CanActivate {
  private readonly AUTHORIZED_NAMES = [
    'ALFREDO RODRIGUEZ',
    'ALVARO CASTELLANOS',
    // ... resto de nombres autorizados
  ].map(name => this.normalize(name));

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const normalizedName = this.normalize(user.fullName);
    return this.AUTHORIZED_NAMES.includes(normalizedName);
  }

  private normalize(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }
}
```

---

## 8. 🧪 Testing

### 8.1 Test de Reservaciones Recurrentes

```typescript
describe('Recurring Reservations', () => {
  it('should create weekly recurring reservations', async () => {
    const dto = {
      roomId: 1,
      reservationDate: '2026-02-10',
      initHour: '09:00',
      endHour: '10:00',
      reason: 'Reunión semanal',
      isRecurring: true,
      recurrencePattern: 'weekly',
      recurrenceEndDate: '2026-03-10',
    };

    const result = await service.createReservation(dto, 1);

    expect(result.recurringInfo.totalCreated).toBeGreaterThan(0);
    expect(result.recurringInfo.createdDates.length).toBe(4); // 4 semanas
  });

  it('should skip conflicting dates', async () => {
    // Crear reservación existente
    await service.createReservation({
      roomId: 1,
      reservationDate: '2026-02-17',
      initHour: '09:00',
      endHour: '10:00',
      reason: 'Conflicto',
    }, 1);

    // Intentar crear recurrente
    const dto = {
      roomId: 1,
      reservationDate: '2026-02-10',
      initHour: '09:00',
      endHour: '10:00',
      reason: 'Reunión semanal',
      isRecurring: true,
      recurrencePattern: 'weekly',
      recurrenceEndDate: '2026-03-10',
    };

    const result = await service.createReservation(dto, 1);

    expect(result.recurringInfo.failedDates).toContain('2026-02-17');
  });
});
```

---

## 9. 📚 Migraciones

### 9.1 Migración para Campos de Recurrencia

```typescript
export class AddRecurringFields1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('reservations', new TableColumn({
      name: 'is_recurring',
      type: 'boolean',
      default: false,
    }));

    await queryRunner.addColumn('reservations', new TableColumn({
      name: 'recurrence_pattern',
      type: 'enum',
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      isNullable: true,
    }));

    await queryRunner.addColumn('reservations', new TableColumn({
      name: 'recurrence_end_date',
      type: 'date',
      isNullable: true,
    }));

    await queryRunner.addColumn('reservations', new TableColumn({
      name: 'parent_reservation_id',
      type: 'int',
      isNullable: true,
    }));

    await queryRunner.createForeignKey('reservations', new TableForeignKey({
      columnNames: ['parent_reservation_id'],
      referencedColumnNames: ['id'],
      referencedTableName: 'reservations',
      onDelete: 'CASCADE',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Implementar rollback
  }
}
```

### 9.2 Migración para Estado Cancelada

```typescript
export class AddCanceledState1234567891 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE reservation_state_enum ADD VALUE 'canceled'
    `);

    await queryRunner.addColumn('reservations', new TableColumn({
      name: 'cancel_reason',
      type: 'varchar',
      length: '250',
      isNullable: true,
    }));
  }
}
```

### 9.3 Migración para Email en Room

```typescript
export class AddEmailToRoom1234567892 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('rooms', new TableColumn({
      name: 'email',
      type: 'varchar',
      isNullable: true,
      default: "''",
    }));
  }
}
```

---

## 10. 📦 Dependencias Necesarias

```bash
# Instalar paquetes
npm install --save @nestjs-modules/mailer nodemailer handlebars
npm install --save @nestjs/schedule
npm install --save-dev @types/nodemailer
```

**package.json:**

```json
{
  "dependencies": {
    "@nestjs-modules/mailer": "^1.9.1",
    "@nestjs/schedule": "^4.0.0",
    "nodemailer": "^6.9.7",
    "handlebars": "^4.7.8",
    "date-fns": "^2.30.0"
  }
}
```

---

## 11. 🔧 Configuración Adicional

### 11.1 Habilitar Scheduler en App Module

```typescript
@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... otros módulos
  ],
})
export class AppModule {}
```

### 11.2 Configurar CORS para Emails

Si usas un servicio de email externo, asegúrate de configurar correctamente los headers CORS.

---

## ✅ Checklist de Implementación

- [ ] Migración de campos de recurrencia
- [ ] Migración de estado cancelada
- [ ] Migración de email en Room
- [ ] Lógica de creación de reservaciones recurrentes
- [ ] Sistema de emails (módulo y templates)
- [ ] Sistema de recordatorios (cron job)
- [ ] Endpoint de cancelación
- [ ] Validación de recursos por cantidad
- [ ] Guards de permisos actualizados
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Documentación de API (Swagger)

---

## 📞 Soporte

Para dudas sobre la implementación, contactar al equipo de desarrollo.

**Fecha de creación:** Febrero 2026
**Versión:** 1.0
