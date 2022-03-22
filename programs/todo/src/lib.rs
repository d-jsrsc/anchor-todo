mod item_add;
mod item_cancel;
mod item_finish;
mod todo_list;

use anchor_lang::prelude::*;
use item_add::*;
use item_cancel::*;
use item_finish::*;
use todo_list::*;

declare_id!("6chWeqWm77cNqLeycGHhneL5UR5ZLn6aS5bToDdbL4CN");

#[program]
pub mod todo {
    use anchor_lang::{
        solana_program::{program::invoke, system_instruction::transfer},
        AccountsClose,
    };

    use super::*;

    pub fn new_list(
        ctx: Context<NewList>,
        name: String,
        capacity: u16,
        account_bump: u8,
    ) -> Result<()> {
        let list = &mut ctx.accounts.list;
        list.list_owner = *(ctx.accounts.user.to_account_info().key);
        list.bump = account_bump;
        list.name = name;
        list.capacity = capacity;
        Ok(())
    }

    pub fn add(
        ctx: Context<Add>,
        _list_name: String,
        item_name: String,
        bounty: u64,
    ) -> Result<()> {
        let user = &ctx.accounts.user;
        let list = &mut ctx.accounts.list;
        let item = &mut ctx.accounts.item;

        require!(
            list.lines.len() < list.capacity as usize,
            TodoListError::ListFull
        );

        list.lines.push(*(item.to_account_info().key));
        item.name = item_name;
        item.creator = *user.to_account_info().key;

        let account_lamports = **(item.to_account_info().lamports.borrow());
        let transfer_amount = bounty
            .checked_sub(account_lamports)
            .ok_or(TodoListError::BountyTooSmall)?;

        if transfer_amount > 0 {
            invoke(
                &transfer(
                    user.to_account_info().key,
                    item.to_account_info().key,
                    transfer_amount,
                ),
                &[
                    user.to_account_info(),
                    item.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        Ok(())
    }

    pub fn cancel(ctx: Context<Cancel>, _list_name: String) -> Result<()> {
        let list = &mut ctx.accounts.list;
        let item = &mut ctx.accounts.item;
        let item_creator = &ctx.accounts.item_creator;

        let user = ctx.accounts.user.to_account_info().key;

        require!(
            &list.list_owner == user || &item.creator == user,
            TodoListError::CancelPermissions
        );
        require!(
            list.lines.contains(item.to_account_info().key),
            TodoListError::ItemNotFound
        );

        item.close(item_creator.to_account_info())?;

        let item_key = ctx.accounts.item.to_account_info().key;
        list.lines.retain(|key| key != item_key);

        Ok(())
    }

    pub fn finish(ctx: Context<Finish>, _list_name: String) -> Result<()> {
        let item = &mut ctx.accounts.item;
        let list = &mut ctx.accounts.list;
        let user = ctx.accounts.user.to_account_info().key;

        require!(
            list.lines.contains(item.to_account_info().key),
            TodoListError::ItemNotFound,
        );

        let is_item_creator = &item.creator == user;
        let is_list_owner: bool = &list.list_owner == user;

        require!(
            is_item_creator || is_list_owner,
            TodoListError::FinishPermissions
        );

        if is_item_creator {
            item.creator_finished = true;
        }
        if is_list_owner {
            item.list_owner_finished = true;
        }

        if item.creator_finished && item.list_owner_finished {
            let item_key = item.to_account_info().key;
            list.lines.retain(|key| key != item_key);
            item.close(ctx.accounts.list_owner.to_account_info())?;
        }

        Ok(())
    }
}

#[error_code]
pub enum TodoListError {
    #[msg("This list is full")]
    ListFull,
    #[msg("Bounty must be enough to mark account rent-exempt")]
    BountyTooSmall,
    #[msg("Only the list owner or item creator may cancel an item")]
    CancelPermissions,
    #[msg("Only the list owner or item creator may finish an item")]
    FinishPermissions,
    #[msg("Item does not belong to this todo list")]
    ItemNotFound,
    #[msg("Specified list owner does not match the pubkey in the list")]
    WrongListOwner,
    #[msg("Specified item creator does not match the pubkey in the item")]
    WrongItemCreator,
}

pub fn name_seed(name: &str) -> &[u8] {
    let b = name.as_bytes();
    if b.len() > 32 {
        &b[0..32]
    } else {
        b
    }
}
